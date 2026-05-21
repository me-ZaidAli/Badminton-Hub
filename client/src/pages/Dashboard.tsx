import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import { PageHeader } from "@/components/ui/page-header";
import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardBanner from "@/components/dashboard/DashboardBanner";
import { DashboardThemesCard, DashboardMembershipsSection } from "@/components/dashboard/DashboardNitroSections";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link, Redirect, useLocation } from "wouter";
import { format, isPast, isFuture, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  Calendar, Trophy, Zap, Users, Clock, Loader2, ChevronRight, Activity, Megaphone, User, LogOut, Eye, Gift,
  MapPin, Swords, CreditCard, Crown, Shield, Star, ArrowUpRight, ArrowDownRight, Shirt, CheckCircle2, Package,
  Medal, MapPinned, Timer,
} from "lucide-react";
import { KpiDetailDialog } from "@/components/ExpandableChartDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: clubs, isLoading: clubsLoading } = useClubs();
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
      sessions={sessions || []}
      clubs={clubs || []}
      effectiveClubId={effectiveClubId}
      onClubChange={setSelectedClubId}
    />
  );
}

function DashboardContent({
  user,
  sessions,
  clubs,
  effectiveClubId,
  onClubChange,
}: {
  user: any;
  sessions: any[];
  clubs: any[];
  effectiveClubId: number | null;
  onClubChange: (v: string) => void;
}) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [kpiDetail, setKpiDetail] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const adminClubId = useAdminClubId();
  const { planStatus, isSuperAdmin } = useClubPlan(adminClubId);

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
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

  const { data: upcomingLeagueMatches } = useQuery<any[]>({
    queryKey: ["/api/league/matches", "upcoming-all"],
    queryFn: async () => {
      const res = await fetch(`/api/league/matches?view=upcoming`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: myLeagueSelections } = useQuery<any[]>({
    queryKey: ["/api/league/my-selections"],
    queryFn: async () => {
      const res = await fetch("/api/league/my-selections", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });


  const { data: myTournaments } = useQuery<any[]>({
    queryKey: ["/api/my-tournament-dashboard"],
    enabled: !!user,
  });

  const { data: allTournaments } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
    enabled: !!user,
  });

  const upcomingJoinable = useMemo(() => {
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
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [allTournaments, myTournaments, effectiveClubId]);

  const featuredJoinTournament = upcomingJoinable[0];
  const upcomingList = upcomingJoinable.slice(0, 4);

  const nextLeagueMatch = useMemo(() => {
    if (!upcomingLeagueMatches || upcomingLeagueMatches.length === 0) return null;
    const now = new Date();
    const upcoming = upcomingLeagueMatches
      .filter((m: any) => m?.matchDatetime && new Date(m.matchDatetime) >= now)
      .sort((a: any, b: any) => new Date(a.matchDatetime).getTime() - new Date(b.matchDatetime).getTime());
    return upcoming[0] || null;
  }, [upcomingLeagueMatches]);

  const { data: bslFixtures } = useQuery<any[]>({
    queryKey: ["/api/bsl/fixtures"],
    queryFn: async () => {
      const res = await fetch("/api/bsl/fixtures", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const nextBslFixture = useMemo(() => {
    if (!bslFixtures || bslFixtures.length === 0) return null;
    const now = Date.now();
    const upcoming = bslFixtures
      .filter((f: any) => {
        if (!f?.startTime) return false;
        const t = new Date(f.startTime).getTime();
        if (Number.isNaN(t) || t < now) return false;
        const s = String(f.status || "").toUpperCase();
        return s === "" || s === "SCHEDULED" || s === "WARMUP" || s === "PUBLISHED" || s === "DRAFT";
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return upcoming[0] || null;
  }, [bslFixtures]);

  const [leagueCountdown, setLeagueCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  useEffect(() => {
    if (!nextLeagueMatch) return;
    const tick = () => {
      const diff = Math.max(0, new Date(nextLeagueMatch.matchDatetime).getTime() - Date.now());
      setLeagueCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [nextLeagueMatch]);

  const { data: allAnnouncements } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: archivedAnnouncementIds } = useQuery<number[]>({
    queryKey: ["/api/announcements/my-archives"],
    enabled: !!user,
  });

  const activeAnnouncements = useMemo(() => {
    const archivedSet = new Set(archivedAnnouncementIds || []);
    return (allAnnouncements || []).filter(a => !archivedSet.has(a.id));
  }, [allAnnouncements, archivedAnnouncementIds]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (effectiveClubId) {
      return sessions.filter(s => s.clubId === effectiveClubId);
    }
    return sessions;
  }, [sessions, effectiveClubId]);

  const totalSessionsCount = filteredSessions.length;

  const mySessionsList = useMemo(() => mySessions || [], [mySessions]);
  const myUpcomingCount = useMemo(() =>
    mySessionsList.filter(s => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE").length,
    [mySessionsList]
  );
  const myPlayedCount = useMemo(() =>
    mySessionsList.filter(s => isPast(new Date(s.sessionDate)) && s.sessionStatus !== "ACTIVE").length,
    [mySessionsList]
  );

  const myUpcomingSessions = useMemo(() => {
    return mySessionsList
      .filter(s => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE")
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
      .slice(0, 5);
  }, [mySessionsList]);

  const kpiChanges = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthSessions = filteredSessions.filter(s => new Date(s.date) >= thisMonth).length;
    const lastMonthSessions = filteredSessions.filter(s => {
      const d = new Date(s.date);
      return isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd });
    }).length;

    const thisMonthSignups = mySessionsList.filter(s => new Date(s.sessionDate) >= thisMonth).length;
    const lastMonthSignups = mySessionsList.filter(s => {
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
      upcoming: myUpcomingCount,
      played: myPlayedCount,
    };
  }, [filteredSessions, mySessionsList, myUpcomingCount, myPlayedCount]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user?.fullName.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          {clubs.length > 1 && (
            <Select value={effectiveClubId?.toString() || ""} onValueChange={onClubChange}>
              <SelectTrigger className="w-[180px] h-9" data-testid="select-dashboard-club">
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <>

      <div>
        <DashboardBanner heightVh={32} />
        <div className="relative z-10 -mt-12 sm:-mt-16 lg:-mt-20">
          <DashboardHero
            userName={user?.fullName || ""}
            sessions={(sessions as any[]) || []}
            profilePictureUrl={(user as any)?.profilePictureUrl || null}
            slotAfterDeals={activeAnnouncements.length > 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-rose-500/15 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)] text-white" data-testid="card-announcements-preview">
                <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-amber-400/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-200/80">
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Announcements</span>
                      <Badge className="bg-amber-400/20 text-amber-100 border border-amber-300/40 text-[10px]">{activeAnnouncements.length}</Badge>
                    </div>
                    <Link href="/announcements">
                      <Button variant="ghost" size="sm" className="text-amber-200 hover:text-white hover:bg-white/10" data-testid="button-view-all-announcements">
                        View All <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {activeAnnouncements.slice(0, 2).map(announcement => (
                      <Link key={announcement.id} href="/announcements">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 cursor-pointer transition" data-testid={`announcement-preview-${announcement.id}`}>
                          <div className="p-1.5 rounded-md bg-amber-400/20 border border-amber-300/30 shrink-0 mt-0.5">
                            <Megaphone className="h-3.5 w-3.5 text-amber-200" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate text-white">{announcement.title}</div>
                            <div className="text-xs text-white/70 mt-0.5 line-clamp-2">{announcement.content}</div>
                            <div className="text-[10px] text-white/50 mt-1 flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              {announcement.author.fullName}
                              <span className="mx-1">·</span>
                              {format(new Date(announcement.createdAt), "MMM d")}
                            </div>
                          </div>
                          {announcement.imageUrl && (
                            <img src={announcement.imageUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0 border border-white/15" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            slotAfterAtAGlance={(
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-violet-500/15 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)] text-white" data-testid="card-my-upcoming-sessions">
                <div className="pointer-events-none absolute -top-20 -right-12 w-72 h-72 rounded-full bg-blue-500/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-blue-200/80">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Your Sessions</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">Sessions you have signed up for</p>
                    </div>
                    <Link href="/my-sessions">
                      <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-white/10" data-testid="button-view-all-my-sessions">
                        View All <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  {mySessionsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />)}
                    </div>
                  ) : myUpcomingSessions.length > 0 ? (
                    <div className="space-y-2">
                      {myUpcomingSessions.map(session => (
                        <div
                          key={session.sessionId}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 cursor-pointer transition"
                          onClick={() => setSelectedSession(session)}
                          data-testid={`my-upcoming-session-${session.sessionId}`}
                        >
                          <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-blue-400/30 to-violet-400/20 border border-blue-300/30 text-white font-bold shrink-0">
                            <span className="text-[10px] uppercase leading-none">{format(new Date(session.sessionDate), "MMM")}</span>
                            <span className="text-base leading-none mt-0.5">{format(new Date(session.sessionDate), "d")}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate text-white">{session.sessionTitle}</div>
                            <div className="text-[11px] text-white/70 flex items-center gap-1 flex-wrap mt-0.5">
                              <Clock className="w-3 h-3" /> {session.sessionStartTime}
                              <span className="mx-1">·</span>
                              {session.courtsAvailable} courts
                              {session.clubName && (
                                <>
                                  <span className="mx-1">·</span>
                                  <span className="text-blue-200">{session.clubName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={`shrink-0 text-[10px] border ${session.sessionStatus === "ACTIVE" ? "bg-emerald-400/20 text-emerald-200 border-emerald-300/40" : "bg-white/10 text-white border-white/20"}`}>
                            {session.sessionStatus === "ACTIVE" ? "Live" : "Upcoming"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-white/70">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No upcoming sessions</p>
                      <p className="text-xs text-white/50 mt-1">Browse sessions to sign up</p>
                      <Link href="/sessions">
                        <Button variant="outline" size="sm" className="mt-3 bg-white/10 border-white/20 text-white hover:bg-white/20" data-testid="button-browse-sessions">
                          Browse Sessions
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Discord Nitro–style sections: themes, memberships (news is now featured above) */}
      <div className="space-y-10 pt-4">
        <DashboardThemesCard />
        <DashboardMembershipsSection />
      </div>

      {((myTournaments && myTournaments.length > 0) || featuredJoinTournament || upcomingList.length > 0) && (
        <div className="flex items-center gap-2 pt-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="text-lg font-bold tracking-tight" data-testid="heading-tournaments">Tournaments</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {myTournaments && myTournaments.length > 0 && myTournaments.map((tournament: any) => (
        <Link key={tournament.tournamentId} href={`/tournaments/${tournament.tournamentId}`}>
          <div
            className="relative overflow-hidden rounded-xl cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]"
            data-testid={`banner-tournament-${tournament.tournamentId}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 dark:from-slate-900 dark:via-blue-950 dark:to-slate-950" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

            <div className="relative z-10 p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm shadow-inner">
                    <Trophy className="h-6 w-6 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{tournament.name}</h3>
                    </div>
                    <p className="text-xs text-amber-300 mt-0.5 font-medium">You're registered for this tournament</p>
                  </div>
                </div>
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 shrink-0">
                  {tournament.status === "REGISTRATION_OPEN" ? "Registration Open" : tournament.status === "IN_PROGRESS" ? "Live" : tournament.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
                  <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">Date</p>
                    <p className="text-sm text-white font-semibold">{format(new Date(tournament.nextStageStartTime || tournament.startDate), "EEE, d MMM yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">Time</p>
                    <p className="text-sm text-white font-semibold">{format(new Date(tournament.nextStageStartTime || tournament.startDate), "h:mm a")}</p>
                  </div>
                </div>
                {tournament.location && (
                  <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
                    <MapPinned className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">Venue</p>
                      <p className="text-sm text-white font-semibold truncate">{tournament.venueName || tournament.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {tournament.myGroups && tournament.myGroups.length > 0 && (
                <div className="space-y-3">
                  {tournament.myGroups.map((group: any) => {
                    const myPair = group.pairs?.find((p: any) => p.isMe);
                    const opponents = group.pairs?.filter((p: any) => !p.isMe) || [];
                    return (
                    <div key={group.groupId} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-400/20">
                            <Medal className="h-4 w-4 text-amber-300" />
                          </div>
                          <div>
                            <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">{group.stageName || "Your Group"}</p>
                            <span className="text-sm font-bold text-white">{group.groupName}</span>
                            {group.categoryName && (
                              <span className="text-xs text-blue-300 ml-2">({group.categoryName})</span>
                            )}
                          </div>
                        </div>
                        {group.startTime && (
                          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                            <Timer className="h-3 w-3 text-amber-300" />
                            <span className="text-xs text-white font-semibold">{format(new Date(group.startTime), "h:mm a")}</span>
                          </div>
                        )}
                      </div>
                      {(group.hallName || group.courtName) && (
                        <div className="flex items-center gap-1.5 mb-3 text-xs text-blue-300">
                          <MapPin className="h-3 w-3" />
                          {[group.hallName, group.courtName].filter(Boolean).join(" - ")}
                        </div>
                      )}

                      {myPair && (
                        <div className="mb-3">
                          <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium mb-1.5">Your Pair</p>
                          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm bg-amber-400/20 border border-amber-400/30 text-white font-bold" data-testid={`tournament-my-pair-${myPair.teamId}`}>
                            <Star className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                            <span>{myPair.player1}{myPair.player2 ? ` & ${myPair.player2}` : ""}</span>
                            {myPair.seedNumber && (
                              <Badge className="ml-auto bg-white/10 text-blue-300 border-0 text-[10px]">Seed #{myPair.seedNumber}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {opponents.length > 0 && (
                        <div>
                          <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium mb-1.5">
                            <Swords className="h-3 w-3 inline mr-1 -mt-0.5" />
                            {group.opponentLabel || "Your opponents at group stage"}
                          </p>
                          <div className="space-y-1.5">
                            {opponents.map((pair: any, idx: number) => (
                              <div
                                key={pair.teamId || idx}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-white/5 text-white"
                                data-testid={`tournament-opponent-pair-${pair.teamId}`}
                              >
                                <Users className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                                <span>{pair.player1}{pair.player2 ? ` & ${pair.player2}` : ""}</span>
                                {pair.seedNumber && (
                                  <Badge className="ml-auto bg-white/10 text-blue-300 border-0 text-[10px]">Seed #{pair.seedNumber}</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}

      {featuredJoinTournament && (
        <Link href={`/tournaments/${featuredJoinTournament.id}`}>
          <div
            className="relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.995] bg-card border border-border"
            style={{ boxShadow: "0 1px 0 hsl(var(--accent)/0.06) inset, 0 18px 40px -22px hsl(var(--primary)/0.55)" }}
            data-testid={`banner-join-tournament-${featuredJoinTournament.id}`}
          >
            <div aria-hidden className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: "radial-gradient(closest-side, hsl(var(--accent)/0.22), transparent 70%)" }} />
            <div aria-hidden className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full pointer-events-none" style={{ background: "radial-gradient(closest-side, hsl(var(--primary)/0.22), transparent 70%)" }} />
            <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.6), transparent)" }} />

            <div className="relative z-10 p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid place-items-center h-11 w-11 rounded-xl shrink-0" style={{ background: "hsl(var(--accent)/0.14)", boxShadow: "inset 0 0 0 1px hsl(var(--accent)/0.35)" }}>
                    <Trophy className="h-5 w-5" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ background: "hsl(var(--accent)/0.14)", color: "hsl(var(--accent))", boxShadow: "inset 0 0 0 1px hsl(var(--accent)/0.30)" }}>
                      <Zap className="h-3 w-3" />New Tournament
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight truncate text-foreground" data-testid={`text-join-tournament-name-${featuredJoinTournament.id}`}>
                      {featuredJoinTournament.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      Registration open · claim your spot before it fills
                    </p>
                  </div>
                </div>
                <div className="grid place-items-center h-9 w-9 rounded-full shrink-0 transition-transform duration-300 group-hover:rotate-45 bg-muted text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-background/60 backdrop-blur border border-border">
                  <Calendar className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-semibold leading-none mb-0.5 text-muted-foreground">When</div>
                    <div className="text-sm font-semibold truncate text-foreground">{format(new Date(featuredJoinTournament.startDate), "EEE, d MMM")}</div>
                  </div>
                </div>
                {featuredJoinTournament.location && (
                  <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-background/60 backdrop-blur border border-border">
                    <MapPinned className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider font-semibold leading-none mb-0.5 text-muted-foreground">Where</div>
                      <div className="text-sm font-semibold truncate text-foreground">{featuredJoinTournament.location}</div>
                    </div>
                  </div>
                )}
                {featuredJoinTournament.maxPlayers && (
                  <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-background/60 backdrop-blur border border-border">
                    <Users className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider font-semibold leading-none mb-0.5 text-muted-foreground">Field</div>
                      <div className="text-sm font-semibold truncate text-foreground">Up to {featuredJoinTournament.maxPlayers} players</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Tap to view details and register your spot
                </p>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.85) 100%)",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 8px 24px -10px hsl(var(--accent)/0.7)",
                  }}
                  data-testid={`button-join-tournament-${featuredJoinTournament.id}`}
                >
                  Join Now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Link>
      )}

      {upcomingList.length > 0 && (
        <Card className="border-border bg-card" data-testid="card-upcoming-tournaments">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="grid place-items-center h-8 w-8 rounded-lg" style={{ background: "hsl(var(--accent)/0.14)", boxShadow: "inset 0 0 0 1px hsl(var(--accent)/0.25)" }}>
                  <Trophy className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div>
                  <CardTitle className="text-base">Upcoming Tournaments</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {upcomingList.length === 1 ? "1 tournament" : `${upcomingList.length} tournaments`} coming up — pick one to compete in
                  </CardDescription>
                </div>
              </div>
              <Link href="/tournaments">
                <Button variant="ghost" size="sm" className="text-xs h-7 hover:bg-muted" style={{ color: "hsl(var(--primary))" }} data-testid="button-view-all-tournaments">
                  View all
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {upcomingList.map((t: any) => (
                <Link key={t.id} href={`/tournaments/${t.id}`}>
                  <div
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group transition-all duration-200 hover:-translate-y-px bg-background border border-border"
                    data-testid={`row-upcoming-tournament-${t.id}`}
                  >
                    <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ background: "linear-gradient(135deg, hsl(var(--accent)/0.16), hsl(var(--primary)/0.16))", boxShadow: "inset 0 0 0 1px hsl(var(--border))" }}>
                      <Trophy className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate" data-testid={`text-upcoming-tournament-name-${t.id}`}>
                          {t.name}
                        </p>
                        {t.status === "ONGOING" && (
                          <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0 rounded" style={{ background: "hsl(var(--destructive)/0.18)", color: "hsl(var(--foreground))", boxShadow: "inset 0 0 0 1px hsl(var(--destructive)/0.4)" }}>
                            <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 animate-pulse" style={{ background: "hsl(var(--destructive))" }} />LIVE
                          </span>
                        )}
                        {t.status === "PUBLISHED" && (
                          <span className="text-[9px] font-bold px-1.5 py-0 rounded" style={{ background: "hsl(var(--primary)/0.14)", color: "hsl(var(--primary))", boxShadow: "inset 0 0 0 1px hsl(var(--primary)/0.3)" }}>
                            Open
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(t.startDate), "d MMM")}
                          {t.endDate && new Date(t.endDate).getTime() !== new Date(t.startDate).getTime() &&
                            ` – ${format(new Date(t.endDate), "d MMM")}`}
                        </span>
                        {t.location && (
                          <span className="flex items-center gap-1 truncate hidden sm:flex">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{t.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-all duration-200 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(user?.role === "ADMIN" || user?.role === "OWNER") && !isSuperAdmin && (
        <Card className={`border ${
          planStatus === "ACTIVE_PREMIUM" ? "border-emerald-500/30 bg-emerald-500/5" :
          planStatus === "PENDING_ACTIVATION" ? "border-amber-500/30 bg-amber-500/5" :
          planStatus === "SUSPENDED" ? "border-red-500/30 bg-red-500/5" :
          "border-border bg-muted/30"
        }`} data-testid="card-plan-status">
          <CardContent className="py-3 px-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {planStatus === "ACTIVE_PREMIUM" ? (
                <Crown className="h-5 w-5 text-emerald-500" />
              ) : (
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm font-semibold">
                  {planStatus === "ACTIVE_PREMIUM" ? "Premium Plan" :
                   planStatus === "PENDING_ACTIVATION" ? "Upgrade Pending" :
                   planStatus === "SUSPENDED" ? "Plan Suspended" :
                   "Free Plan"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {planStatus === "ACTIVE_PREMIUM" ? "All features unlocked" :
                   planStatus === "PENDING_ACTIVATION" ? "Waiting for admin activation" :
                   planStatus === "SUSPENDED" ? "Contact platform admin to reactivate" :
                   "Upgrade to unlock rankings, analytics, and more"}
                </p>
              </div>
            </div>
            {planStatus === "FREE" && (
              <Link href="/admin/billing">
                <Button size="sm" variant="outline" data-testid="button-upgrade-plan">
                  Upgrade
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20" data-testid="card-refer-earn">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-lg shrink-0">
              <Gift className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">Refer & Earn</h3>
              <p className="text-xs text-muted-foreground">Invite friends and earn {"\u00A3"}4 reward for each approved referral</p>
            </div>
          </div>
          <Link href="/referrals">
            <Button size="sm" className="w-full mt-3" data-testid="button-go-referrals">
              <Gift className="h-4 w-4 mr-1" /> Start Referring
            </Button>
          </Link>
        </CardContent>
      </Card>

      {((myLeagueSelections && myLeagueSelections.length > 0) || nextLeagueMatch) && (
        <div className="flex items-center gap-2 pt-2">
          <Swords className="h-4 w-4 text-emerald-500" />
          <h2 className="text-lg font-bold tracking-tight" data-testid="heading-league">Your League</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {myLeagueSelections && myLeagueSelections.length > 0 && (
        <div className="space-y-3" data-testid="league-selections-banner">
          {myLeagueSelections.map((sel: any) => {
            const pairGroups: Record<string, string[]> = {};
            const unassigned: string[] = [];
            (sel.players || []).forEach((p: any) => {
              if (p.position) {
                if (!pairGroups[p.position]) pairGroups[p.position] = [];
                pairGroups[p.position].push(p.userName || "Unknown");
              } else {
                unassigned.push(p.userName || "Unknown");
              }
            });
            const isMyReserve = sel.myPosition === "Reserve";
            let myPartner: string | null = null;
            if (sel.myPosition && sel.myPosition !== "Reserve") {
              const pairMembers = pairGroups[sel.myPosition] || [];
              const partner = pairMembers.find((n: string) => n !== user?.fullName);
              if (partner) myPartner = partner;
            }

            return (
              <Link key={sel.id} href="/league">
                <div
                  className="relative overflow-hidden rounded-2xl cursor-pointer group"
                  data-testid={`league-selection-${sel.id}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950" />
                  <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 21px)" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400" />

                  <div className="relative z-10 p-5">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                            <Star className="h-2.5 w-2.5 text-amber-900 fill-amber-900" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                            You've Been Selected!
                          </p>
                          <p className="text-[10px] sm:text-xs text-emerald-300/70 font-medium">
                            {sel.leagueName || "League Match"}
                          </p>
                        </div>
                      </div>
                      {sel.myPosition && (
                        <Badge className={`text-[10px] sm:text-xs border-0 shrink-0 font-bold px-3 py-1 ${isMyReserve ? "bg-amber-500/30 text-amber-200 shadow-amber-500/20 shadow-sm" : "bg-emerald-400/25 text-emerald-100 shadow-emerald-500/20 shadow-sm"}`}>
                          {sel.myPosition}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 text-center bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-emerald-500/20">
                        <p className="text-white font-bold text-sm sm:text-base truncate">{sel.clubName || "Your Club"}</p>
                        {sel.teamName && <p className="text-emerald-300/60 text-[10px] truncate mt-0.5">{sel.teamName}</p>}
                      </div>
                      <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/30">
                        <span className="text-white font-black text-xs">VS</span>
                      </div>
                      <div className="flex-1 text-center bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-emerald-500/20">
                        <p className="text-white font-bold text-sm sm:text-base truncate">{sel.opponentClub}</p>
                        {sel.category && <p className="text-emerald-300/60 text-[10px] truncate mt-0.5">{sel.category}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-[10px] sm:text-xs text-emerald-200/90 mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 rounded-full px-3 py-1.5">
                        <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-medium">{format(new Date(sel.matchDatetime), "EEE, MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 rounded-full px-3 py-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-medium">{format(new Date(sel.matchDatetime), "h:mm a")}</span>
                      </div>
                      {sel.venue && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 rounded-full px-3 py-1.5">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="truncate max-w-[150px] font-medium">{sel.venue}</span>
                        </div>
                      )}
                    </div>

                    {myPartner && (
                      <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 rounded-xl p-3.5 border border-emerald-400/25 mb-4" data-testid="partner-info">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                            <Users className="h-5 w-5 text-emerald-300" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-emerald-300/80 uppercase font-bold tracking-wider">Your Partner ({sel.myPosition})</p>
                            <p className="text-base font-bold text-white mt-0.5">{myPartner}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                            <Star className="h-4 w-4 text-emerald-300 fill-emerald-300/50" />
                          </div>
                        </div>
                      </div>
                    )}

                    {Object.keys(pairGroups).length > 0 && (
                      <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3.5 border border-emerald-500/15">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-4 w-4 text-emerald-400" />
                          <span className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-wider">Full Team Lineup</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(pairGroups).sort(([a], [b]) => a.localeCompare(b)).map(([position, names]) => (
                            <div key={position} className="bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-500/10">
                              <p className="text-[9px] font-bold text-emerald-400 uppercase mb-1.5 tracking-wide">{position}</p>
                              {names.map((name, i) => (
                                <p key={i} className={`text-[11px] sm:text-xs truncate ${
                                  name === user?.fullName ? "text-emerald-200 font-bold" : "text-white/70"
                                }`}>
                                  {name === user?.fullName ? `${name} (You)` : name}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                        {unassigned.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-emerald-500/10">
                            <p className="text-[10px] text-emerald-300/50">Also selected: {unassigned.join(", ")}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {Object.keys(pairGroups).length === 0 && sel.players && sel.players.length > 0 && (
                      <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3.5 border border-emerald-500/15">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-emerald-400" />
                          <span className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-wider">Selected Players</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-white/70">
                          {sel.players.map((p: any) => p.userName === user?.fullName ? `${p.userName} (You)` : p.userName).join(", ")}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-emerald-300/60 group-hover:text-emerald-200 transition-colors">
                        <span className="font-medium">View League Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {nextLeagueMatch && (
        <Link href="/league" className="mt-4 block">
          <div
            className="relative overflow-hidden rounded-xl cursor-pointer hover-elevate animate-[card-glow_3s_ease-in-out_infinite]"
            data-testid="card-upcoming-league-match"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a2e] via-[#0d1117] to-[#0a1628]" />
            <div className="absolute inset-0 animate-[sweep_4s_linear_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_45%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.03)_55%,transparent_100%)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1 sm:px-5">
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4 text-amber-400 animate-[pulse_2s_ease-in-out_infinite]" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                    Next League Match
                  </span>
                </div>
                {nextLeagueMatch.leagueName && (
                  <Badge className="bg-white/15 text-white/90 border-0 text-[9px] sm:text-[10px] shrink-0">
                    {nextLeagueMatch.leagueName}
                  </Badge>
                )}
              </div>

              <div className="flex items-stretch px-3 sm:px-4 py-2">
                <div className="flex-1 flex items-center justify-center rounded-lg border border-red-500/30 bg-black/40 px-3 py-3 animate-[glow-red_3s_ease-in-out_infinite]">
                  <div className="text-center overflow-hidden">
                    <p className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2">
                      {nextLeagueMatch.clubName || "Your Club"}
                    </p>
                    {nextLeagueMatch.teamName && (
                      <p className="text-white/60 text-[9px] sm:text-[10px] truncate mt-1">{nextLeagueMatch.teamName}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 w-14 sm:w-16 flex items-center justify-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-[heartbeat_1.2s_ease-in-out_infinite]">
                    <span className="text-white font-black text-sm sm:text-base">VS</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center rounded-lg border border-blue-500/30 bg-black/40 px-3 py-3 animate-[glow-blue_3s_ease-in-out_infinite]">
                  <div className="text-center overflow-hidden">
                    <p className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2">
                      {nextLeagueMatch.opponentClub}
                    </p>
                    {nextLeagueMatch.category && (
                      <p className="text-white/60 text-[9px] sm:text-[10px] truncate mt-1">{nextLeagueMatch.category}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-2" data-testid="league-match-countdown">
                {[
                  { value: leagueCountdown.days, label: "DAYS" },
                  { value: leagueCountdown.hours, label: "HRS" },
                  { value: leagueCountdown.minutes, label: "MIN" },
                ].map((unit) => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center">
                      <span className="text-white font-bold text-lg sm:text-xl tabular-nums">{String(unit.value).padStart(2, "0")}</span>
                    </div>
                    <span className="text-white/40 text-[8px] sm:text-[9px] font-semibold tracking-widest mt-1">{unit.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 pb-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-white/80 text-[10px] sm:text-xs">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                  <span>{format(new Date(nextLeagueMatch.matchDatetime), "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-[10px] sm:text-xs">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                  <span>{format(new Date(nextLeagueMatch.matchDatetime), "h:mm a")}</span>
                </div>
                {nextLeagueMatch.location && (
                  <Badge className={`text-[9px] sm:text-[10px] border-0 ${nextLeagueMatch.location === "HOME" ? "bg-green-500/30 text-green-300" : "bg-blue-500/30 text-blue-300"}`}>
                    {nextLeagueMatch.location}
                  </Badge>
                )}
              </div>
              {nextLeagueMatch.venue && (
                <div className="flex items-center justify-center gap-1.5 pb-3 text-white/50 text-[9px] sm:text-xs">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[250px]">{nextLeagueMatch.venue}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      {nextBslFixture && (
        <div className="flex items-center gap-2 pt-2">
          <Trophy className="h-4 w-4 text-cyan-500" />
          <h2 className="text-lg font-bold tracking-tight" data-testid="heading-bsl">Birmingham Super League</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {nextBslFixture && (
        <Link href={`/bsl/match/${nextBslFixture.id}`} className="mt-4 block">
          <div
            className="relative overflow-hidden rounded-xl cursor-pointer hover-elevate"
            data-testid="card-upcoming-bsl-fixture"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#031a2b] via-[#0a2540] to-[#001724]" />
            <div className="absolute inset-0 animate-[sweep_4s_linear_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(34,211,238,0.04)_45%,rgba(250,204,21,0.08)_50%,rgba(34,211,238,0.04)_55%,transparent_100%)]" />
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1 sm:px-5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400 animate-[pulse_2s_ease-in-out_infinite]" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                    Next BSL Fixture
                  </span>
                </div>
                <Badge className="bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 text-[9px] sm:text-[10px] shrink-0">
                  Birmingham Super League
                </Badge>
              </div>

              <div className="flex items-stretch px-3 sm:px-4 py-2">
                <div className="flex-1 flex items-center justify-center rounded-lg border border-cyan-400/30 bg-black/40 px-3 py-3">
                  <div className="text-center overflow-hidden flex flex-col items-center gap-1">
                    {nextBslFixture.homeClubLogo && (
                      <img src={nextBslFixture.homeClubLogo} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                    )}
                    <p className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2">
                      {nextBslFixture.homeClubName || nextBslFixture.homeTeamName || "TBD"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-14 sm:w-16 flex items-center justify-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <span className="text-white font-black text-sm sm:text-base">VS</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center rounded-lg border border-amber-400/30 bg-black/40 px-3 py-3">
                  <div className="text-center overflow-hidden flex flex-col items-center gap-1">
                    {nextBslFixture.awayClubLogo && (
                      <img src={nextBslFixture.awayClubLogo} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                    )}
                    <p className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2">
                      {nextBslFixture.awayClubName || nextBslFixture.awayTeamName || "TBD"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 pb-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-white/85 text-[10px] sm:text-xs">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-300" />
                  <span>{format(new Date(nextBslFixture.startTime), "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/85 text-[10px] sm:text-xs">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-300" />
                  <span>{format(new Date(nextBslFixture.startTime), "h:mm a")}</span>
                </div>
                {nextBslFixture.court && (
                  <Badge className="bg-white/10 text-white/85 border border-white/15 text-[9px] sm:text-[10px]">
                    Court {nextBslFixture.court}
                  </Badge>
                )}
                {nextBslFixture.category && (
                  <Badge className="bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[9px] sm:text-[10px]">
                    {nextBslFixture.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Activity className="h-4 w-4 text-violet-500" />
        <h2 className="text-lg font-bold tracking-tight" data-testid="heading-at-a-glance">At a Glance</h2>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" data-testid="stats-grid">
        {[
          { id: "club-sessions", label: "Club Sessions", icon: Calendar, value: totalSessionsCount, change: kpiChanges.sessions, hint: "in this club", testId: "text-total-sessions", grad: "from-blue-500/25 via-indigo-500/10 to-blue-500/5", halo: "bg-blue-400/25", text: "text-blue-200", click: () => setKpiDetail("club-sessions") },
          { id: "my-sessions", label: "My Sessions", icon: Users, value: mySessionsList.length, change: kpiChanges.signups, hint: "signed up", testId: "text-my-sessions-count", grad: "from-emerald-500/25 via-teal-500/10 to-emerald-500/5", halo: "bg-emerald-400/25", text: "text-emerald-200", click: () => setKpiDetail("my-sessions") },
          { id: "upcoming", label: "Upcoming", icon: Zap, value: myUpcomingCount, change: 0, hint: "sessions ahead", testId: "text-upcoming-count", grad: "from-amber-500/25 via-orange-500/10 to-amber-500/5", halo: "bg-amber-400/25", text: "text-amber-200", click: () => navigate("/my-sessions") },
          { id: "played", label: "Played", icon: Activity, value: myPlayedCount, change: 0, hint: "completed", testId: "text-sessions-played", grad: "from-violet-500/25 via-fuchsia-500/10 to-violet-500/5", halo: "bg-violet-400/25", text: "text-violet-200", click: () => setKpiDetail("played") },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.id}
              onClick={kpi.click}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${kpi.grad} p-4 sm:p-5 text-left text-white shadow-[0_6px_22px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30`}
              data-testid={`kpi-${kpi.id}`}
            >
              <div className={`pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full ${kpi.halo} blur-3xl`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] ${kpi.text}`}>{kpi.label}</p>
                  <div className="p-1.5 rounded-lg bg-white/10 border border-white/10">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums" data-testid={kpi.testId}>{kpi.value}</span>
                  {kpi.change !== 0 && (
                    <Badge className={`text-[10px] px-1.5 py-0 gap-0.5 font-semibold border ${kpi.change > 0 ? "text-emerald-200 bg-emerald-500/20 border-emerald-300/40" : "text-rose-200 bg-rose-500/20 border-rose-300/40"}`}>
                      {kpi.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(kpi.change)}%
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-white/60 mt-1">{kpi.hint}</p>
              </div>
            </button>
          );
        })}
      </div>


      <KpiDetailDialog open={kpiDetail === "club-sessions"} onOpenChange={(o) => !o && setKpiDetail(null)} title="Club Sessions" description={`${totalSessionsCount} sessions in this club`}>
        {filteredSessions.length > 0 ? (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead className="text-right">Courts</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredSessions.slice(0, 20).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title || "Untitled"}</TableCell>
                  <TableCell>{format(new Date(s.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{s.startTime}</TableCell>
                  <TableCell className="text-right">{s.courtsAvailable}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">No sessions found</p>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog open={kpiDetail === "my-sessions"} onOpenChange={(o) => !o && setKpiDetail(null)} title="My Sessions" description={`${mySessionsList.length} sessions signed up`}>
        {mySessionsList.length > 0 ? (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Fee</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {mySessionsList.slice(0, 20).map((s: any) => (
                <TableRow key={s.sessionId}>
                  <TableCell className="font-medium">{s.sessionTitle || "Untitled"}</TableCell>
                  <TableCell>{format(new Date(s.sessionDate), "MMM d, yyyy")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.signupStatus}</Badge></TableCell>
                  <TableCell className="text-right">{"\u00A3"}{((s.fee ?? 0) / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">No sessions found</p>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog open={kpiDetail === "played"} onOpenChange={(o) => !o && setKpiDetail(null)} title="Sessions Played" description={`${myPlayedCount} sessions completed`}>
        {myPlayedCount > 0 ? (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Payment</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {mySessionsList.filter((s: any) => isPast(new Date(s.sessionDate)) && s.sessionStatus !== "ACTIVE").slice(0, 20).map((s: any) => (
                <TableRow key={s.sessionId}>
                  <TableCell className="font-medium">{s.sessionTitle || "Untitled"}</TableCell>
                  <TableCell>{format(new Date(s.sessionDate), "MMM d, yyyy")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.paymentStatus || "N/A"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">No completed sessions</p>
        )}
      </KpiDetailDialog>



      </>

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
                    setSelectedSession(null);
                    navigate(`/sessions/${selectedSession.sessionId}`);
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
