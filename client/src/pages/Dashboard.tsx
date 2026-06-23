import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClubs } from "@/hooks/use-clubs";
import { useClubPlan } from "@/hooks/use-club-plan";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link, Redirect, useLocation } from "wouter";
import { format, isFuture, isPast, startOfMonth, subMonths, endOfMonth, isWithinInterval } from "date-fns";
import {
  Calendar, Trophy, Zap, Users, Clock, Loader2, ChevronRight, Activity, Megaphone, Eye, LogOut,
  MapPin, Swords, Crown, Medal, ArrowUpRight, ArrowDownRight, Sparkles, Target, MessageSquare,
  GraduationCap, Flame, type LucideIcon,
} from "lucide-react";

const GOLD = "#EAB308";

function GlassCard({
  children,
  className = "",
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${className}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  useEffect(() => {
    if (!selectedClubId) {
      if (user?.playerProfile?.clubId) {
        setSelectedClubId(user.playerProfile.clubId.toString());
      } else if (clubs && clubs.length > 0) {
        setSelectedClubId(clubs[0].id.toString());
      }
    }
  }, [user?.playerProfile?.clubId, selectedClubId, clubs]);

  if (userLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Loading..." description="Please wait while we load your dashboard." />
      </div>
    );
  }

  const playerProfile = user?.playerProfile;
  const playerProfiles = user?.playerProfiles || [];
  const membershipStatus = playerProfile?.membershipStatus;
  const isPlatformAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const hasClubAdminRole = playerProfiles.some(
    (p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER"
  );
  const hasApprovedMembership = playerProfiles.some(
    (p: any) => p.membershipStatus === "APPROVED"
  );
  const canAccessDashboard = isPlatformAdmin || hasClubAdminRole || hasApprovedMembership;

  if (!canAccessDashboard) {
    if (membershipStatus === "PENDING") {
      return <Redirect to="/pending-approval" />;
    }
    if (membershipStatus === "REJECTED") {
      return <Redirect to="/clubs" />;
    }
    if (!playerProfile) {
      return <Redirect to="/clubs" />;
    }
  }

  const firstApprovedProfile = playerProfiles.find((p: any) => p.membershipStatus === "APPROVED");
  const effectiveClubId = selectedClubId
    ? Number(selectedClubId)
    : (playerProfile?.clubId || firstApprovedProfile?.clubId || null);

  return (
    <DashboardContent
      user={user!}
      clubs={clubs || []}
      effectiveClubId={effectiveClubId}
      onClubChange={setSelectedClubId}
    />
  );
}

function DashboardContent({
  user,
  clubs,
  effectiveClubId,
  onClubChange,
}: {
  user: any;
  clubs: any[];
  effectiveClubId: number | null;
  onClubChange: (v: string) => void;
}) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isPremium } = useClubPlan(effectiveClubId);

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
    staleTime: 60_000,
  });

  const { data: activity } = useQuery<{ totalSessions: number; sessionsThisMonth: number; totalSpent: number }>({
    queryKey: ["/api/my-session-activity"],
    enabled: !!user,
  });

  const { data: allAnnouncements } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: archivedAnnouncementIds } = useQuery<number[]>({
    queryKey: ["/api/announcements/my-archives"],
    enabled: !!user,
  });

  const { data: weeklyChallenges } = useQuery<any[]>({
    queryKey: ["/api/junior-weekly-challenges"],
    enabled: !!user,
  });

  const { data: myTournaments } = useQuery<any[]>({
    queryKey: ["/api/my-tournament-dashboard"],
    enabled: !!user,
  });

  const { data: allTournaments } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
    enabled: !!user,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("POST", `/api/sessions/${sessionId}/withdraw`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-session-activity"] });
      setSelectedSession(null);
      toast({ title: "Withdrawn", description: "You have been removed from this session." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to withdraw", variant: "destructive" });
    },
  });

  const firstName = (user?.fullName || "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const clubName = useMemo(
    () => clubs.find((c) => c.id === effectiveClubId)?.name || "Your club",
    [clubs, effectiveClubId]
  );

  const profile = user?.playerProfile;
  const grade = profile?.grade || profile?.category || "—";
  const matchesPlayed = profile?.matchesPlayed ?? 0;
  const matchesWon = profile?.matchesWon ?? 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

  const activeAnnouncements = useMemo(() => {
    const archivedSet = new Set(archivedAnnouncementIds || []);
    return (allAnnouncements || []).filter((a) => !archivedSet.has(a.id));
  }, [allAnnouncements, archivedAnnouncementIds]);

  const mySessionsList = useMemo(() => mySessions || [], [mySessions]);

  const myUpcomingSessions = useMemo(() => {
    return mySessionsList
      .filter((s) => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE")
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  }, [mySessionsList]);

  const myUpcomingCount = myUpcomingSessions.length;
  const nextSession = myUpcomingSessions[0] || null;

  const recentActivity = useMemo(() => {
    return mySessionsList
      .filter((s) => isPast(new Date(s.sessionDate)) && s.sessionStatus !== "ACTIVE")
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .slice(0, 4);
  }, [mySessionsList]);

  const sessionsThisMonth = useMemo(() => {
    if (typeof activity?.sessionsThisMonth === "number") return activity.sessionsThisMonth;
    const monthStart = startOfMonth(new Date());
    return mySessionsList.filter((s) => new Date(s.sessionDate) >= monthStart).length;
  }, [activity, mySessionsList]);

  const sessionsThisMonthChange = useMemo(() => {
    const now = new Date();
    const lastStart = startOfMonth(subMonths(now, 1));
    const lastEnd = endOfMonth(subMonths(now, 1));
    const lastMonth = mySessionsList.filter((s) =>
      isWithinInterval(new Date(s.sessionDate), { start: lastStart, end: lastEnd })
    ).length;
    if (lastMonth === 0) return sessionsThisMonth > 0 ? 100 : 0;
    return Math.round(((sessionsThisMonth - lastMonth) / lastMonth) * 100);
  }, [mySessionsList, sessionsThisMonth]);

  const challengeOfWeek = useMemo(() => {
    const revealed = (weeklyChallenges || []).filter((c: any) => c.isRevealed);
    return revealed.sort((a: any, b: any) => b.weekNumber - a.weekNumber)[0] || null;
  }, [weeklyChallenges]);

  const upcomingTournaments = useMemo(() => {
    if (!allTournaments) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const myIds = new Set((myTournaments || []).map((t: any) => t.tournamentId));
    return allTournaments
      .filter((t: any) => {
        if (myIds.has(t.id)) return false;
        if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
        if (effectiveClubId && t.clubId !== effectiveClubId) return false;
        const end = t.endDate ? new Date(t.endDate) : null;
        if (end && end < today) return false;
        return true;
      })
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [allTournaments, myTournaments, effectiveClubId]);

  const heroStats = [
    { label: "Membership", value: isPremium ? "Premium" : "Basic", icon: Crown },
    { label: "Club", value: clubName, icon: Users },
    { label: "Upcoming", value: String(myUpcomingCount), icon: Calendar },
    { label: "Grade", value: grade, icon: Medal },
  ];

  const quickActions: { label: string; href: string; icon: LucideIcon }[] = [
    { label: "Join Session", href: "/sessions", icon: Zap },
    { label: "View Rankings", href: "/rankings", icon: Trophy },
    { label: "Enter Tournament", href: "/tournaments", icon: Swords },
    { label: "Track Progress", href: "/my-training-profile", icon: Target },
  ];

  return (
    <div
      className="rounded-3xl text-white overflow-hidden -mx-1 sm:mx-0"
      style={{ background: "#0B0F17" }}
      data-testid="dashboard-premium"
    >
      <div className="relative p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl" style={{ background: "rgba(234,179,8,0.10)" }} />
        <div className="pointer-events-none absolute top-1/3 -left-24 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(99,102,241,0.08)" }} />

        {/* club selector */}
        {clubs.length > 1 && (
          <div className="relative flex justify-end">
            <Select value={effectiveClubId?.toString() || ""} onValueChange={onClubChange}>
              <SelectTrigger
                className="w-[200px] h-9 bg-white/5 border-white/10 text-white"
                data-testid="select-dashboard-club"
              >
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 1. HERO */}
        <section className="relative">
          <GlassCard
            className="relative overflow-hidden p-6 sm:p-8 lg:p-10"
            testId="section-hero"
          >
            <div
              className="pointer-events-none absolute -top-20 -right-10 w-80 h-80 rounded-full blur-3xl"
              style={{ background: "rgba(234,179,8,0.18)" }}
            />
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/50 mb-3">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  {clubName}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" data-testid="text-greeting">
                  {greeting}, <span style={{ color: GOLD }}>{firstName}</span>
                </h1>
                <div className="mt-6 flex flex-wrap gap-3">
                  {heroStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                        data-testid={`hero-stat-${stat.label.toLowerCase()}`}
                      >
                        <Icon className="w-4 h-4 text-white/40 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-white/40">{stat.label}</div>
                          <div className="text-sm font-semibold truncate max-w-[120px]">{stat.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto">
                <Button
                  size="lg"
                  className="h-12 px-7 font-semibold border-0 text-black hover:opacity-90"
                  style={{ background: GOLD }}
                  onClick={() => navigate("/sessions")}
                  data-testid="button-join-session"
                >
                  <Zap className="w-4 h-4 mr-2" /> Join Session
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 font-semibold bg-white/5 border-white/15 text-white hover:bg-white/10"
                  onClick={() => navigate("/my-sessions")}
                  data-testid="button-view-schedule"
                >
                  <Calendar className="w-4 h-4 mr-2" /> View Schedule
                </Button>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* 2. QUICK ACTIONS */}
        <section className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <GlassCard
                    className="group p-5 sm:p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
                    testId={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div
                      className="grid place-items-center h-12 w-12 rounded-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: "rgba(234,179,8,0.12)", boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.3)" }}
                    >
                      <Icon className="h-6 w-6" style={{ color: GOLD }} />
                    </div>
                    <div className="font-semibold text-sm sm:text-base">{action.label}</div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3. YOUR NEXT SESSION */}
        <section className="relative">
          <SectionHeading
            title="Your Next Session"
            subtitle="Your most upcoming booking"
            action={
              <Link href="/my-sessions">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-all-sessions">
                  All sessions <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            }
          />
          {mySessionsLoading ? (
            <GlassCard className="h-40 animate-pulse" />
          ) : nextSession ? (
            <GlassCard className="relative overflow-hidden p-6 sm:p-8" testId="card-next-session">
              <div
                className="pointer-events-none absolute -bottom-16 -right-12 w-72 h-72 rounded-full blur-3xl"
                style={{ background: "rgba(234,179,8,0.10)" }}
              />
              <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center justify-center flex-col w-20 h-20 rounded-2xl border border-white/10 bg-white/[0.04] shrink-0">
                  <span className="text-[11px] uppercase tracking-wider text-white/50">
                    {format(new Date(nextSession.sessionDate), "MMM")}
                  </span>
                  <span className="text-3xl font-bold leading-none mt-0.5" style={{ color: GOLD }}>
                    {format(new Date(nextSession.sessionDate), "d")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold truncate">{nextSession.sessionTitle}</h3>
                    {nextSession.sessionStatus === "ACTIVE" && (
                      <Badge className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 text-[10px]">Live</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/60">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{format(new Date(nextSession.sessionDate), "EEE, dd MMM yyyy")}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{nextSession.sessionStartTime}</span>
                    {(nextSession.venueName || nextSession.clubName) && (
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{nextSession.venueName || nextSession.clubName}</span>
                    )}
                    {typeof nextSession.courtsAvailable === "number" && (
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{nextSession.courtsAvailable} courts</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row md:flex-col gap-2 shrink-0">
                  <Button
                    className="font-semibold border-0 text-black hover:opacity-90"
                    style={{ background: GOLD }}
                    onClick={() => navigate(`/sessions/${nextSession.sessionId}`)}
                    data-testid="button-view-next-session"
                  >
                    <Eye className="w-4 h-4 mr-2" /> View Session
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white/5 border-white/15 text-white hover:bg-white/10"
                    onClick={() => setSelectedSession(nextSession)}
                    data-testid="button-withdraw-next-session"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Withdraw
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-10 text-center" testId="empty-next-session">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="font-semibold text-lg">No upcoming sessions</p>
              <p className="text-sm text-white/50 mt-1">Browse what's on and book your next game.</p>
              <Button
                className="mt-5 font-semibold border-0 text-black hover:opacity-90"
                style={{ background: GOLD }}
                onClick={() => navigate("/sessions")}
                data-testid="button-browse-sessions"
              >
                Browse Sessions
              </Button>
            </GlassCard>
          )}
        </section>

        {/* 4. MY PERFORMANCE */}
        <section className="relative">
          <SectionHeading title="My Performance" subtitle="A quick read on your form" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <GlassCard className="p-6" testId="kpi-sessions-month">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-white/40">Sessions This Month</span>
                <Calendar className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums">{sessionsThisMonth}</span>
                {sessionsThisMonthChange !== 0 && (
                  <Badge className={`text-[10px] gap-0.5 border ${sessionsThisMonthChange > 0 ? "text-emerald-200 bg-emerald-500/15 border-emerald-300/30" : "text-rose-200 bg-rose-500/15 border-rose-300/30"}`}>
                    {sessionsThisMonthChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(sessionsThisMonthChange)}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/40 mt-1">vs last month</p>
            </GlassCard>

            <GlassCard className="p-6" testId="kpi-win-rate">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-white/40">Win Rate</span>
                <Trophy className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums" style={{ color: GOLD }}>{winRate}</span>
                <span className="text-xl font-semibold text-white/40">%</span>
              </div>
              <p className="text-xs text-white/40 mt-1">{matchesWon} of {matchesPlayed} matches won</p>
            </GlassCard>

            <Link href="/rankings">
              <GlassCard className="p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25" testId="kpi-ranking">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-wider text-white/40">Current Grade</span>
                  <Medal className="w-4 h-4 text-white/30" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums">{grade}</span>
                </div>
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">View rankings <ChevronRight className="w-3 h-3" /></p>
              </GlassCard>
            </Link>
          </div>
        </section>

        {/* 5. CLUB NEWS */}
        <section className="relative">
          <SectionHeading
            title="Club News"
            subtitle="Latest announcements"
            action={
              <Link href="/announcements">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-view-all-announcements">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            }
          />
          {activeAnnouncements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {activeAnnouncements.slice(0, 3).map((a) => (
                <Link key={a.id} href="/announcements">
                  <GlassCard
                    className="group p-5 h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25"
                    testId={`announcement-${a.id}`}
                  >
                    <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                      <Megaphone className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      {format(new Date(a.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="font-semibold mb-1.5 line-clamp-2">{a.title}</div>
                    <p className="text-sm text-white/50 line-clamp-3">{a.content}</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          ) : (
            <GlassCard className="p-8 text-center" testId="empty-announcements">
              <Megaphone className="h-8 w-8 mx-auto mb-2 text-white/30" />
              <p className="text-sm text-white/50">No announcements right now.</p>
            </GlassCard>
          )}
        </section>

        {/* 6. BADMINTON HUB */}
        <section className="relative">
          <SectionHeading title="Badminton Hub" subtitle="Everything in one place" />
          <GlassCard className="p-5 sm:p-6" testId="section-badminton-hub">
            <Tabs defaultValue="tournaments">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="tournaments" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="tab-tournaments">Tournaments</TabsTrigger>
                <TabsTrigger value="coaching" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="tab-coaching">Coaching</TabsTrigger>
                <TabsTrigger value="rankings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="tab-rankings">Rankings</TabsTrigger>
              </TabsList>

              <TabsContent value="tournaments" className="mt-5">
                {upcomingTournaments.length > 0 ? (
                  <div className="space-y-2.5">
                    {upcomingTournaments.map((t: any) => (
                      <Link key={t.id} href={`/tournaments/${t.id}`}>
                        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition cursor-pointer" data-testid={`hub-tournament-${t.id}`}>
                          <div className="grid place-items-center h-10 w-10 rounded-lg shrink-0" style={{ background: "rgba(234,179,8,0.12)" }}>
                            <Swords className="h-5 w-5" style={{ color: GOLD }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{t.name}</div>
                            <div className="text-xs text-white/50">{t.startDate ? format(new Date(t.startDate), "EEE, dd MMM yyyy") : "Date TBC"}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-white/50">
                    <Swords className="h-8 w-8 mx-auto mb-2 text-white/30" />
                    No open tournaments to enter right now.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="coaching" className="mt-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="grid place-items-center h-12 w-12 rounded-xl shrink-0" style={{ background: "rgba(234,179,8,0.12)" }}>
                    <GraduationCap className="h-6 w-6" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Find a coach</div>
                    <p className="text-sm text-white/50">Book one-to-one lessons and track your training.</p>
                  </div>
                  <Link href="/coaching">
                    <Button className="font-semibold border-0 text-black hover:opacity-90" style={{ background: GOLD }} data-testid="button-explore-coaching">
                      Explore coaching
                    </Button>
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="rankings" className="mt-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="grid place-items-center h-12 w-12 rounded-xl shrink-0" style={{ background: "rgba(234,179,8,0.12)" }}>
                    <Trophy className="h-6 w-6" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Club rankings</div>
                    <p className="text-sm text-white/50">You're currently graded <span className="font-semibold" style={{ color: GOLD }}>{grade}</span>. See where you stand.</p>
                  </div>
                  <Link href="/rankings">
                    <Button className="font-semibold border-0 text-black hover:opacity-90" style={{ background: GOLD }} data-testid="button-view-rankings-hub">
                      View rankings
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </GlassCard>
        </section>

        {/* 7. CHALLENGE OF THE WEEK */}
        <section className="relative">
          <SectionHeading title="Challenge of the Week" subtitle="Keep your streak going" />
          {challengeOfWeek ? (
            <GlassCard className="relative overflow-hidden p-6 sm:p-8" testId="card-challenge">
              <div className="pointer-events-none absolute -top-12 -right-10 w-64 h-64 rounded-full blur-3xl" style={{ background: "rgba(234,179,8,0.12)" }} />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="grid place-items-center h-14 w-14 rounded-2xl shrink-0" style={{ background: "rgba(234,179,8,0.14)", boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.3)" }}>
                  <Flame className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Week {challengeOfWeek.weekNumber} · {challengeOfWeek.skillPointsReward} pts</div>
                  <h3 className="text-lg font-bold">{challengeOfWeek.title}</h3>
                  {challengeOfWeek.description && (
                    <p className="text-sm text-white/50 mt-1 line-clamp-2">{challengeOfWeek.description}</p>
                  )}
                </div>
                <Link href="/training-challenges">
                  <Button className="font-semibold border-0 text-black hover:opacity-90 shrink-0" style={{ background: GOLD }} data-testid="button-view-challenge">
                    View Challenge
                  </Button>
                </Link>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center" testId="empty-challenge">
              <Flame className="h-8 w-8 mx-auto mb-2 text-white/30" />
              <p className="text-sm text-white/50">No active challenge this week. Check back soon.</p>
            </GlassCard>
          )}
        </section>

        {/* 8. BOTTOM: RECENT ACTIVITY + COMMUNITY */}
        <section className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <SectionHeading title="Recent Activity" subtitle="Your latest sessions" />
            <GlassCard className="p-5" testId="card-recent-activity">
              {recentActivity.length > 0 ? (
                <div className="space-y-2.5">
                  {recentActivity.map((s) => (
                    <div key={s.sessionId} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03]" data-testid={`activity-${s.sessionId}`}>
                      <div className="grid place-items-center h-9 w-9 rounded-lg bg-white/[0.05] shrink-0">
                        <Activity className="h-4 w-4 text-white/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{s.sessionTitle || "Session"}</div>
                        <div className="text-xs text-white/40">{format(new Date(s.sessionDate), "EEE, dd MMM")}</div>
                      </div>
                      {s.paymentStatus && (
                        <Badge className="text-[10px] bg-white/5 border border-white/10 text-white/60">{s.paymentStatus}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-white/50">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-white/30" />
                  No recent sessions yet.
                </div>
              )}
            </GlassCard>
          </div>

          <div>
            <SectionHeading title="Community" subtitle="Connect with your club" />
            <Link href="/community">
              <GlassCard className="group p-8 h-[calc(100%-2.5rem)] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25" testId="card-community">
                <div className="grid place-items-center h-14 w-14 rounded-2xl mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(234,179,8,0.12)", boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.3)" }}>
                  <MessageSquare className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <div className="font-semibold text-lg">Community Hub</div>
                <p className="text-sm text-white/50 mt-1 max-w-xs">Events, social play and conversations with fellow members.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: GOLD }}>
                  Open community <ChevronRight className="w-4 h-4" />
                </span>
              </GlassCard>
            </Link>
          </div>
        </section>
      </div>

      {/* Session withdraw dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[400px]">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedSession.sessionTitle}</DialogTitle>
                <DialogDescription className="text-xs">
                  {format(new Date(selectedSession.sessionDate), "EEE, dd MMM yyyy")} at {selectedSession.sessionStartTime}
                  {selectedSession.clubName && ` - ${selectedSession.clubName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    const id = selectedSession.sessionId;
                    setSelectedSession(null);
                    navigate(`/sessions/${id}`);
                  }}
                  data-testid="button-view-session-popup"
                >
                  <Eye className="h-4 w-4" /> View Session
                </Button>
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  onClick={() => withdrawMutation.mutate(selectedSession.sessionId)}
                  disabled={withdrawMutation.isPending}
                  data-testid="button-withdraw-popup"
                >
                  {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Withdraw from Session
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
