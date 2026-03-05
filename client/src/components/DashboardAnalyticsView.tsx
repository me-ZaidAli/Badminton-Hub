import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend, Area, AreaChart,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isPast, isFuture } from "date-fns";
import {
  TrendingUp, TrendingDown, Calendar, Users, Activity, Zap,
  Target, Award, ArrowUpRight, BarChart3, Clock,
} from "lucide-react";

interface DashboardAnalyticsProps {
  sessions: any[];
  mySessions: any[];
  clubs: any[];
  effectiveClubId: number | null;
  user: any;
}

const NEON_COLORS = [
  "hsl(174, 100%, 50%)",
  "hsl(262, 100%, 65%)",
  "hsl(36, 100%, 55%)",
  "hsl(340, 100%, 60%)",
  "hsl(142, 100%, 50%)",
  "hsl(199, 100%, 55%)",
];

const DONUT_SETS = [
  ["#06b6d4", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#6366f1"],
  ["#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#a855f7", "#22c55e"],
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl" data-testid="chart-tooltip">
      <p className="text-xs font-medium text-slate-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardAnalyticsView({ sessions, mySessions, clubs, effectiveClubId, user }: DashboardAnalyticsProps) {
  const filteredSessions = useMemo(() => {
    if (effectiveClubId) return sessions.filter(s => s.clubId === effectiveClubId);
    return sessions;
  }, [sessions, effectiveClubId]);

  const sessionActivityByMonth = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 7; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthSessions = filteredSessions.filter(s => {
        const d = new Date(s.date);
        return isWithinInterval(d, { start, end });
      });
      const completed = monthSessions.filter(s => s.status === "COMPLETED").length;
      const active = monthSessions.filter(s => s.status === "ACTIVE" || s.status === "UPCOMING").length;
      data.push({
        name: format(monthDate, "MMM"),
        completed,
        active,
        total: monthSessions.length,
      });
    }
    return data;
  }, [filteredSessions]);

  const matchModeDistribution = useMemo(() => {
    const modes: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const mode = s.matchMode || "SOCIAL";
      modes[mode] = (modes[mode] || 0) + 1;
    });
    return Object.entries(modes).map(([name, value]) => ({ name, value }));
  }, [filteredSessions]);

  const sessionStatusDistribution = useMemo(() => {
    const statuses: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const status = s.status || "UNKNOWN";
      statuses[status] = (statuses[status] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [filteredSessions]);

  const signupsPerSession = useMemo(() => {
    return filteredSessions
      .filter(s => s.signupCount > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12)
      .map(s => ({
        name: s.title?.substring(0, 12) || format(new Date(s.date), "MMM d"),
        signups: s.signupCount || 0,
        max: s.maxPlayers || 0,
        fill: (s.signupCount / (s.maxPlayers || 1)) > 0.8 ? NEON_COLORS[0] : NEON_COLORS[5],
      }));
  }, [filteredSessions]);

  const performanceTrend = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthMySessions = mySessions.filter(s => {
        const d = new Date(s.sessionDate);
        return isWithinInterval(d, { start, end });
      });
      const played = monthMySessions.filter(s => isPast(new Date(s.sessionDate)) && s.sessionStatus !== "ACTIVE").length;
      const upcoming = monthMySessions.filter(s => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE").length;
      data.push({
        name: format(monthDate, "MMM"),
        played,
        signedUp: monthMySessions.length,
        upcoming,
      });
    }
    return data;
  }, [mySessions]);

  const clubDistribution = useMemo(() => {
    const clubMap: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const name = s.clubName || "Unknown";
      clubMap[name] = (clubMap[name] || 0) + 1;
    });
    return Object.entries(clubMap).map(([name, value]) => ({ name, value }));
  }, [filteredSessions]);

  const matchStats = useMemo(() => {
    let totalMatches = 0;
    let totalSignups = 0;
    let totalCourts = 0;
    filteredSessions.forEach(s => {
      totalMatches += (s.completedMatchCount || 0) + (s.liveMatchCount || 0);
      totalSignups += s.signupCount || 0;
      totalCourts += s.courtsAvailable || 0;
    });
    const avgSignups = filteredSessions.length > 0 ? (totalSignups / filteredSessions.length).toFixed(1) : "0";
    const avgCourts = filteredSessions.length > 0 ? (totalCourts / filteredSessions.length).toFixed(1) : "0";
    return { totalMatches, totalSignups, avgSignups, avgCourts };
  }, [filteredSessions]);

  const fillRate = useMemo(() => {
    if (filteredSessions.length === 0) return 0;
    const totalSignups = filteredSessions.reduce((sum, s) => sum + (s.signupCount || 0), 0);
    const totalCapacity = filteredSessions.reduce((sum, s) => sum + (s.maxPlayers || 0), 0);
    return totalCapacity > 0 ? Math.round((totalSignups / totalCapacity) * 100) : 0;
  }, [filteredSessions]);

  const fillRateData = [{ name: "Fill Rate", value: fillRate, fill: "hsl(174, 100%, 50%)" }];

  const genderDistribution = useMemo(() => {
    const genders: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const g = s.genderRestriction || "ALL";
      genders[g] = (genders[g] || 0) + 1;
    });
    return Object.entries(genders).map(([name, value]) => ({ name, value }));
  }, [filteredSessions]);

  return (
    <div className="space-y-4" data-testid="dashboard-analytics-view">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="analytics-kpi-strip">
        {[
          { label: "Total Matches", value: matchStats.totalMatches, icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { label: "Total Signups", value: matchStats.totalSignups, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Avg Signups/Session", value: matchStats.avgSignups, icon: BarChart3, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Avg Courts", value: matchStats.avgCourts, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map((kpi, i) => (
          <Card key={i} className="bg-slate-950 border-slate-800/60" data-testid={`analytics-kpi-${i}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">{kpi.label}</span>
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 bg-slate-950 border-slate-800/60" data-testid="card-session-activity-bar">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200">Session Activity</CardTitle>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" /> Active</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionActivityByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completed" fill="hsl(174, 100%, 50%)" radius={[3, 3, 0, 0]} name="Completed" />
                  <Bar dataKey="active" fill="hsl(262, 100%, 65%)" radius={[3, 3, 0, 0]} name="Active" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <Card className="bg-slate-950 border-slate-800/60" data-testid="card-match-mode-donut">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-slate-300">Match Mode</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={matchModeDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                      {matchModeDistribution.map((_, i) => (
                        <Cell key={i} fill={DONUT_SETS[0][i % DONUT_SETS[0].length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center px-1">
                {matchModeDistribution.map((d, i) => (
                  <span key={i} className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: DONUT_SETS[0][i % DONUT_SETS[0].length] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800/60" data-testid="card-status-donut">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-slate-300">Session Status</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sessionStatusDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                      {sessionStatusDistribution.map((_, i) => (
                        <Cell key={i} fill={DONUT_SETS[1][i % DONUT_SETS[1].length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center px-1">
                {sessionStatusDistribution.map((d, i) => (
                  <span key={i} className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: DONUT_SETS[1][i % DONUT_SETS[1].length] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800/60" data-testid="card-gender-donut">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-slate-300">Gender Split</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                      {genderDistribution.map((_, i) => (
                        <Cell key={i} fill={DONUT_SETS[0][(i + 2) % DONUT_SETS[0].length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center px-1">
                {genderDistribution.map((d, i) => (
                  <span key={i} className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: DONUT_SETS[0][(i + 2) % DONUT_SETS[0].length] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800/60" data-testid="card-fill-rate-radial">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-slate-300">Fill Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex flex-col items-center justify-center">
              <div className="relative h-[130px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={fillRateData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "rgba(148,163,184,0.08)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-cyan-400">{fillRate}%</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-center">Capacity utilization</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-950 border-slate-800/60" data-testid="card-performance-trend">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200">My Performance Trend</CardTitle>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">6 months</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="signedUp" stroke="hsl(174, 100%, 50%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(174, 100%, 50%)" }} name="Signed Up" />
                  <Line type="monotone" dataKey="played" stroke="hsl(262, 100%, 65%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(262, 100%, 65%)" }} name="Played" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800/60" data-testid="card-signups-per-session">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200">Signups per Session</CardTitle>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">Recent</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signupsPerSession} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="signups" radius={[3, 3, 0, 0]} name="Signups">
                    {signupsPerSession.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Bar dataKey="max" fill="rgba(148,163,184,0.12)" radius={[3, 3, 0, 0]} name="Capacity" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {clubs.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-slate-950 border-slate-800/60" data-testid="card-club-distribution">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200">Club Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clubDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {clubDistribution.map((_, i) => (
                        <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800/60" data-testid="card-club-sessions-bar">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200">Sessions by Club</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clubDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Sessions">
                      {clubDistribution.map((_, i) => (
                        <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
