import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClubs, useSessionLeaderboard } from "@/hooks/use-clubs";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import { useToast } from "@/hooks/use-toast";
import { useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link, Redirect, useLocation } from "wouter";
import { format, isPast, isFuture } from "date-fns";
import {
  Calendar, Trophy, Zap, TrendingUp, Building2, Plus, Percent,
  Users, Target, Clock, Loader2, ChevronRight, Activity, Filter, Megaphone, User, LogOut, Eye, Gift,
  MapPin, Swords, CreditCard, Crown, Share2, Shield, Star
} from "lucide-react";
import vsBannerBg from "@/assets/images/vs-banner-bg.png";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import { KpiDetailDialog } from "@/components/ExpandableChartDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function SessionMiniLeaderboard({ sessionId }: { sessionId: number }) {
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

  return (
    <div className="space-y-1.5" data-testid={`session-mini-leaderboard-${sessionId}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-muted-foreground">Session Rankings</span>
      </div>
      {top3.map((player, index) => (
        <div
          key={player.id}
          className="flex items-center gap-2 text-xs"
          data-testid={`session-${sessionId}-rank-${player.id}`}
        >
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
      playerProfile={playerProfile || firstApprovedProfile || null}
      sessions={sessions || []}
      sessionsLoading={sessionsLoading}
      clubs={clubs || []}
      clubsLoading={clubsLoading}
      effectiveClubId={effectiveClubId}
      onClubChange={setSelectedClubId}
    />
  );
}

function DashboardContent({
  user,
  playerProfile,
  sessions,
  sessionsLoading,
  clubs,
  clubsLoading,
  effectiveClubId,
  onClubChange,
}: {
  user: any;
  playerProfile: any;
  sessions: any[];
  sessionsLoading: boolean;
  clubs: any[];
  clubsLoading: boolean;
  effectiveClubId: number | null;
  onClubChange: (v: string) => void;
}) {
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [kpiDetail, setKpiDetail] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const adminClubId = useAdminClubId();
  const { planStatus, isPremium, isSuperAdmin } = useClubPlan(adminClubId);

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

  const nextLeagueMatch = useMemo(() => {
    if (!upcomingLeagueMatches || upcomingLeagueMatches.length === 0) return null;
    const now = new Date();
    const upcoming = upcomingLeagueMatches
      .filter((m: any) => new Date(m.matchDatetime) >= now)
      .sort((a: any, b: any) => new Date(a.matchDatetime).getTime() - new Date(b.matchDatetime).getTime());
    return upcoming[0] || upcomingLeagueMatches[0];
  }, [upcomingLeagueMatches]);

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

  const pastSessions = useMemo(() =>
    filteredSessions
      .filter(s => isPast(new Date(s.date)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
    [filteredSessions]
  );

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

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(' ')[0]}!`}
        description="Your dashboard overview."
      />

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

      {activeAnnouncements.length > 0 && (
        <Card data-testid="card-announcements-preview">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-5 w-5 text-amber-500" />
                Announcements
                <Badge variant="secondary" className="text-xs">{activeAnnouncements.length}</Badge>
              </CardTitle>
              <Link href="/announcements">
                <Button variant="ghost" size="sm" data-testid="button-view-all-announcements">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAnnouncements.slice(0, 2).map(announcement => (
                <Link key={announcement.id} href="/announcements">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover-elevate cursor-pointer" data-testid={`announcement-preview-${announcement.id}`}>
                    <div className="p-1.5 rounded-md bg-amber-500/10 shrink-0 mt-0.5">
                      <Megaphone className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{announcement.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{announcement.content}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {announcement.author.fullName}
                        <span className="mx-1">-</span>
                        {format(new Date(announcement.createdAt), "MMM d")}
                      </div>
                    </div>
                    {announcement.imageUrl && (
                      <img src={announcement.imageUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
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
              <p className="text-xs text-muted-foreground">Invite friends and earn {"\u00A3"}4 credit for each approved referral</p>
            </div>
          </div>
          <Link href="/referrals">
            <Button size="sm" className="w-full mt-3" data-testid="button-go-referrals">
              <Gift className="h-4 w-4 mr-1" /> Start Referring
            </Button>
          </Link>
        </CardContent>
      </Card>

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

      <Card data-testid="card-my-upcoming-sessions">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              My Upcoming Sessions
            </CardTitle>
            <Link href="/my-sessions">
              <Button variant="ghost" size="sm" data-testid="button-view-all-my-sessions">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <CardDescription>Sessions you have signed up for</CardDescription>
        </CardHeader>
        <CardContent>
          {mySessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-lg" />)}
            </div>
          ) : myUpcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {myUpcomingSessions.map(session => (
                <div
                  key={session.sessionId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover-elevate cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                  data-testid={`my-upcoming-session-${session.sessionId}`}
                >
                  <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-primary/10 rounded-lg text-primary font-bold shrink-0">
                    <span className="text-[9px] sm:text-[10px] uppercase leading-none">{format(new Date(session.sessionDate), "MMM")}</span>
                    <span className="text-base sm:text-lg leading-none">{format(new Date(session.sessionDate), "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{session.sessionTitle}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      <Clock className="w-3 h-3" /> {session.sessionStartTime}
                      <span className="mx-1">-</span>
                      {session.courtsAvailable} courts
                      {session.clubName && (
                        <>
                          <span className="mx-1">-</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{session.clubName}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={session.sessionStatus === "ACTIVE" ? "default" : "secondary"} className="shrink-0 text-[10px]">
                    {session.sessionStatus === "ACTIVE" ? "Live" : "Upcoming"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No upcoming sessions</p>
              <p className="text-xs mt-1">Browse sessions to sign up</p>
              <Link href="/sessions">
                <Button variant="outline" size="sm" className="mt-3" data-testid="button-browse-sessions">
                  Browse Sessions
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {clubs.length > 0 && (
        <div className="flex items-center gap-2" data-testid="club-filter">
          <label className="text-sm font-medium text-muted-foreground">Club:</label>
          <Select value={effectiveClubId?.toString() || ""} onValueChange={onClubChange}>
            <SelectTrigger className="w-[200px]" data-testid="select-dashboard-club">
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
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4" data-testid="stats-grid">
        <Card className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("club-sessions")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Club Sessions</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-total-sessions">{totalSessionsCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">in this club</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("my-sessions")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">My Sessions</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-my-sessions-count">{mySessionsList.length}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">signed up</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => navigate("/my-sessions")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">My Upcoming</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-upcoming-count">{myUpcomingCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">sessions ahead</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("played")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Played</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-sessions-played">{myPlayedCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">completed</div>
          </CardContent>
        </Card>
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

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10" data-testid="card-create-club">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-lg shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">Start Your Own Club or Group</h3>
              <p className="text-xs text-muted-foreground">Create and manage your club</p>
            </div>
          </div>
          <Link href="/create-club">
            <Button size="sm" className="w-full mt-3" data-testid="button-create-club">
              <Plus className="h-4 w-4 mr-1" /> Create Club
            </Button>
          </Link>
        </CardContent>
      </Card>

      {pastSessions.length > 0 && (
        <div data-testid="recent-sessions-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Recent Sessions
            </h2>
            <Link href="/sessions">
              <Button variant="ghost" size="sm">View All Sessions</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastSessions.map(session => (
              <Card key={session.id} className="border-border/50" data-testid={`recent-session-card-${session.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/sessions/${session.id}`}>
                        <CardTitle className="text-sm font-semibold truncate hover:text-primary cursor-pointer transition-colors" data-testid={`text-session-title-${session.id}`}>
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
                    <SessionMiniLeaderboard sessionId={session.id} />
                  </div>
                  <Link href={`/sessions/${session.id}`}>
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" data-testid={`button-view-session-${session.id}`}>
                      View Session Details <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const clubsWithSocials = clubs.filter((c: any) => {
          const links = c.socialLinks || [];
          return links.some((l: any) => l.url?.trim());
        });
        if (clubsWithSocials.length === 0) return null;
        const activeClub = clubsWithSocials.find((c: any) => c.id === effectiveClubId) || clubsWithSocials[0];
        const socialLinks = activeClub?.socialLinks || [];
        return (
          <Card data-testid="card-follow-us">
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Share2 className="w-4 h-4 text-primary" />
                  Follow {activeClub?.name || "Us"}
                </div>
                {clubsWithSocials.length > 1 && (
                  <Select value={String(activeClub?.id)} onValueChange={(v) => onClubChange(v)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-social-club-dashboard">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clubsWithSocials.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <SocialLinksDisplay links={socialLinks} showLabel={false} />
            </CardContent>
          </Card>
        );
      })()}

      <PlayerStatsDialog
        profileId={statsPlayerId}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />

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
