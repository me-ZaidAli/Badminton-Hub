import { useState, useMemo } from "react";
import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { useQuery } from "@tanstack/react-query";
import { useClubs, useSessionLeaderboard } from "@/hooks/use-clubs";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import { useIsAnyClubPremium } from "@/hooks/use-club-plan";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { format, isPast, isFuture, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  Calendar, Trophy, TrendingUp, Building2, Plus,
  Users, Clock, Loader2, ChevronRight, Activity,
  Swords, Crown, Share2, ArrowUpRight, ArrowDownRight,
  BarChart3, Lightbulb, Target, Zap,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardAnalyticsView from "@/components/DashboardAnalyticsView";

function SessionMiniLeaderboard({ sessionId, completedMatchCount, liveMatchCount }: { sessionId: number; completedMatchCount?: number; liveMatchCount?: number }) {
  const { data: leaderboard, isLoading } = useSessionLeaderboard(sessionId);

  if (isLoading) {
    return (
      <div className="py-3 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="py-2 text-center text-xs text-muted-foreground">
        No match results yet
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const totalSessionMatches = (completedMatchCount || 0) + (liveMatchCount || 0);

  return (
    <div className="space-y-1.5" data-testid={`session-mini-leaderboard-${sessionId}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground">Session Rankings</span>
        </div>
        {totalSessionMatches > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 h-5 gap-1" data-testid={`text-match-count-${sessionId}`}>
            <Swords className="w-3 h-3" />
            {totalSessionMatches} {totalSessionMatches === 1 ? "match" : "matches"}
          </Badge>
        )}
      </div>
      {top3.map((player, index) => (
        <div key={player.id} className="flex items-center gap-2 text-xs" data-testid={`session-${sessionId}-rank-${player.id}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
            index === 0 ? "bg-amber-500 text-white" :
            index === 1 ? "bg-gray-400 text-white" :
            "bg-amber-700 text-white"
          }`}>
            {index + 1}
          </div>
          <span className="flex-1 truncate font-medium">{player.fullName}</span>
          <span className="text-green-600 font-medium">{player.matchesWon}W</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-red-500 font-medium">{player.matchesLost}L</span>
          <span className="font-semibold text-foreground ml-1">{player.winPercentage}%</span>
        </div>
      ))}
      {leaderboard.length > 3 && (
        <div className="text-[10px] text-muted-foreground text-center pt-0.5">
          +{leaderboard.length - 3} more players
        </div>
      )}
    </div>
  );
}

export default function MyInsights() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: sessions } = useSessions();
  const { data: clubs } = useClubs();
  const isPremium = useIsAnyClubPremium();

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"overview" | "analytics">("overview");

  const effectiveClubId = selectedClubId ? Number(selectedClubId) : (user?.playerProfile?.clubId || null);

  const { data: mySessions } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
  });

  const mySessionsList = useMemo(() => mySessions || [], [mySessions]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (effectiveClubId) return sessions.filter((s: any) => s.clubId === effectiveClubId);
    return sessions;
  }, [sessions, effectiveClubId]);

  const pastSessions = useMemo(() =>
    filteredSessions
      .filter((s: any) => isPast(new Date(s.date)))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6),
    [filteredSessions]
  );

  const totalSessionsCount = filteredSessions.length;
  const myUpcomingCount = useMemo(() =>
    mySessionsList.filter((s: any) => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE").length,
    [mySessionsList]
  );
  const myPlayedCount = useMemo(() =>
    mySessionsList.filter((s: any) => isPast(new Date(s.sessionDate)) && s.sessionStatus !== "ACTIVE").length,
    [mySessionsList]
  );

  const sessionActivityData = useMemo(() => {
    const now = new Date();
    const months: { name: string; sessions: number; signups: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthSessions = filteredSessions.filter((s: any) => {
        const d = new Date(s.date);
        return isWithinInterval(d, { start, end });
      });
      const monthSignups = mySessionsList.filter((s: any) => {
        const d = new Date(s.sessionDate);
        return isWithinInterval(d, { start, end });
      });
      months.push({
        name: format(monthDate, "MMM"),
        sessions: monthSessions.length,
        signups: monthSignups.length,
      });
    }
    return months;
  }, [filteredSessions, mySessionsList]);

  const monthlyAttendanceData = useMemo(() => {
    const now = new Date();
    const months: { name: string; attended: number; missed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthPlayed = mySessionsList.filter((s: any) => {
        const d = new Date(s.sessionDate);
        return isPast(d) && s.sessionStatus !== "ACTIVE" && isWithinInterval(d, { start, end });
      });
      const attended = monthPlayed.filter((s: any) => s.attendanceStatus === "ATTENDED" || s.attendanceStatus === "PARTIAL_ATTENDANCE" || s.attendanceStatus === "LATE_ARRIVAL").length;
      months.push({
        name: format(monthDate, "MMM"),
        attended,
        missed: monthPlayed.length - attended,
      });
    }
    return months;
  }, [mySessionsList]);

  const kpiChanges = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthSessions = filteredSessions.filter((s: any) => new Date(s.date) >= thisMonth).length;
    const lastMonthSessions = filteredSessions.filter((s: any) => {
      const d = new Date(s.date);
      return isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd });
    }).length;

    const thisMonthSignups = mySessionsList.filter((s: any) => new Date(s.sessionDate) >= thisMonth).length;
    const lastMonthSignups = mySessionsList.filter((s: any) => {
      const d = new Date(s.sessionDate);
      return isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd });
    }).length;

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      sessions: calcChange(thisMonthSessions, lastMonthSessions),
      signups: calcChange(thisMonthSignups, lastMonthSignups),
    };
  }, [filteredSessions, mySessionsList]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-my-insights-title">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            My Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your activity trends, charts, and session history</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "overview" ? "default" : "ghost"}
              onClick={() => setViewMode("overview")}
              className="gap-1.5 h-8"
              data-testid="button-insights-overview"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Insights</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "analytics" ? "default" : "ghost"}
              onClick={() => setViewMode("analytics")}
              className="gap-1.5 h-8"
              data-testid="button-insights-analytics"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Club Analytics</span>
            </Button>
          </div>
          {clubs && clubs.length > 1 && (
            <Select value={effectiveClubId?.toString() || ""} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[180px] h-9" data-testid="select-insights-club">
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club: any) => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {viewMode === "analytics" ? (
        <DashboardAnalyticsView
          sessions={sessions || []}
          mySessions={mySessionsList}
          clubs={clubs || []}
          effectiveClubId={effectiveClubId}
          user={user}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" data-testid="insights-stats-grid">
            <Card className="border-border/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Club Sessions</p>
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-insights-total-sessions">{totalSessionsCount}</span>
                  {kpiChanges.sessions !== 0 && (
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 gap-0.5 font-semibold ${kpiChanges.sessions > 0 ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
                      {kpiChanges.sessions > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(kpiChanges.sessions)}%
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">in this club</p>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">My Sessions</p>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight">{mySessionsList.length}</span>
                  {kpiChanges.signups !== 0 && (
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 gap-0.5 font-semibold ${kpiChanges.signups > 0 ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
                      {kpiChanges.signups > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(kpiChanges.signups)}%
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">signed up</p>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Upcoming</p>
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </div>
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">{myUpcomingCount}</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">sessions ahead</p>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Played</p>
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <Activity className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                </div>
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">{myPlayedCount}</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">completed</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/40" data-testid="card-insights-session-activity">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Session Activity
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">Last 6 months</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sessionActivityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sessionGradientInsights" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#sessionGradientInsights)" name="Club Sessions" />
                    <Area type="monotone" dataKey="signups" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="none" strokeDasharray="5 5" name="My Signups" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40" data-testid="card-insights-attendance">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Monthly Attendance
                </CardTitle>
                <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Attended</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> Missed</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[220px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAttendanceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="attended" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="Attended" />
                    <Bar dataKey="missed" fill="hsl(217 91% 80%)" radius={[4, 4, 0, 0]} name="Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {pastSessions.length > 0 && (
            <div data-testid="insights-recent-sessions">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Recent Session Rankings
                </h2>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" data-testid="button-view-all-sessions-insights">View All Sessions</Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastSessions.map((session: any) => (
                  <Card key={session.id} className="border-border/50" data-testid={`insights-session-card-${session.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/sessions/${session.id}`}>
                            <CardTitle className="text-sm font-semibold truncate hover:text-primary cursor-pointer transition-colors">
                              {session.title}
                            </CardTitle>
                          </Link>
                          <CardDescription className="text-xs mt-1">
                            {format(new Date(session.date), "MMM d, yyyy")} at {session.startTime}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {session.courtsAvailable} courts
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="border-t border-border/50 pt-3 mt-1">
                        <SessionMiniLeaderboard sessionId={session.id} completedMatchCount={session.completedMatchCount} liveMatchCount={session.liveMatchCount} />
                      </div>
                      <Link href={`/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" data-testid={`button-view-insight-session-${session.id}`}>
                          View Session Details <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {!isPremium && !isSuperAdmin && (
              <Card className="bg-gradient-to-br from-slate-900 to-blue-950 text-white border-0 overflow-hidden relative" data-testid="card-premium-promo-insights">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, rgba(59,130,246,0.4), transparent 60%)" }} />
                <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="h-6 w-6 text-amber-400" />
                      <h3 className="text-lg font-bold">Unlock Premium Analytics</h3>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Get advanced player intelligence, match analytics, and detailed performance tracking.
                    </p>
                  </div>
                  <Link href="/admin/billing">
                    <Button className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold" data-testid="button-upgrade-premium-insights">
                      Upgrade Now <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-border/40" data-testid="card-create-club-insights">
              <CardContent className="p-6 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-bold">Start a Club</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create and manage your own racket sports club or group. Invite players and organise sessions.
                  </p>
                </div>
                <Link href="/create-club">
                  <Button className="w-full mt-4" data-testid="button-create-club-insights">
                    <Plus className="h-4 w-4 mr-1" /> Create Club
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {(() => {
            const allClubs = clubs || [];
            const clubsWithSocials = allClubs.filter((c: any) => {
              const links = c.socialLinks || [];
              return links.some((l: any) => l.url?.trim());
            });
            if (clubsWithSocials.length === 0) return null;
            const activeClub = clubsWithSocials.find((c: any) => c.id === effectiveClubId) || clubsWithSocials[0];
            const socialLinks = activeClub?.socialLinks || [];
            return (
              <Card data-testid="card-follow-us-insights">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Share2 className="w-4 h-4 text-primary" />
                      Follow {activeClub?.name || "Us"}
                    </div>
                  </div>
                  <SocialLinksDisplay links={socialLinks} showLabel={false} />
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}