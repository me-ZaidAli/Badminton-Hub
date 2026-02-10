import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { useClubs, useLeaderboard, useSessionLeaderboard } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, Redirect } from "wouter";
import { format, isPast, isFuture } from "date-fns";
import {
  Calendar, Trophy, Zap, TrendingUp, Building2, Plus, Percent,
  Users, Target, Clock, Loader2, ChevronRight, Activity, Filter
} from "lucide-react";

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
    (p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER" || p.clubRole === "ORGANISER" || p.clubRole === "COACH"
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
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(effectiveClubId);
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.filter(p => {
      if (genderFilter !== "ALL" && p.gender !== genderFilter) return false;
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
      return true;
    });
  }, [leaderboard, genderFilter, categoryFilter]);

  const availableGenders = useMemo(() => {
    if (!leaderboard) return [];
    const set = new Set(leaderboard.map(p => p.gender).filter(Boolean));
    return [...set].sort();
  }, [leaderboard]);

  const availableCategories = useMemo(() => {
    if (!leaderboard) return [];
    const set = new Set(leaderboard.map(p => p.category).filter(Boolean));
    return [...set].sort();
  }, [leaderboard]);

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

  const upcomingSessions = useMemo(() =>
    filteredSessions
      .filter(s => isFuture(new Date(s.date)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3),
    [filteredSessions]
  );

  const totalSessionsCount = filteredSessions.length;
  const pastSessionsCount = filteredSessions.filter(s => isPast(new Date(s.date))).length;
  const upcomingSessionsCount = filteredSessions.filter(s => isFuture(new Date(s.date))).length;

  const myLeaderboardEntry = leaderboard?.find(p => p.id === playerProfile?.id);
  const myMatchesPlayed = myLeaderboardEntry?.matchesPlayed ?? 0;
  const myMatchesWon = myLeaderboardEntry?.matchesWon ?? 0;
  const myWinPct = myLeaderboardEntry?.winPercentage ?? 0;
  const myRank = leaderboard ? (leaderboard.findIndex(p => p.id === playerProfile?.id) + 1) || 0 : 0;

  const totalClubMatches = leaderboard?.reduce((sum, p) => sum + p.matchesPlayed, 0) || 0;
  const totalPlayers = leaderboard?.length || 0;
  const topPlayers = filteredLeaderboard.slice(0, 10);

  const avgWinRate = filteredLeaderboard.length > 0
    ? Math.round(filteredLeaderboard.reduce((sum, p) => sum + p.winPercentage, 0) / filteredLeaderboard.length)
    : 0;
  const totalFilteredMatches = filteredLeaderboard.reduce((sum, p) => sum + p.matchesPlayed, 0);

  const clubName = effectiveClubId
    ? clubs.find(c => c.id === effectiveClubId)?.name || "Club"
    : "Club";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={`Welcome back, ${user?.fullName.split(' ')[0]}!`}
          description="Your badminton dashboard overview."
        />
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
      </div>

      {myRank > 0 && (
        <Card className="border-primary/30 bg-primary/5" data-testid="card-my-rank">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Your Rank</div>
                  <div className="text-2xl font-bold text-primary" data-testid="text-my-rank">#{myRank}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg font-bold" data-testid="text-my-played">{myMatchesPlayed}</div>
                  <div className="text-xs text-muted-foreground">Played</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600" data-testid="text-my-won">{myMatchesWon}</div>
                  <div className="text-xs text-muted-foreground">Won</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${myWinPct >= 50 ? "text-green-600" : "text-muted-foreground"}`} data-testid="text-my-winpct">{myWinPct}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-sessions">{totalSessionsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">{upcomingSessionsCount} upcoming</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Players</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-active-players">{totalPlayers}</div>
            <div className="text-xs text-muted-foreground mt-1">with match results</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-matches">{totalClubMatches}</div>
            <div className="text-xs text-muted-foreground mt-1">completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions Played</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-sessions-played">{pastSessionsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">completed</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50" data-testid="card-leaderboard">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  {effectiveClubId ? clubName : "Club"} Leaderboard
                </CardTitle>
                <CardDescription>Players ranked by wins and win percentage</CardDescription>
              </div>
              <Link href="/all-rankings">
                <Button variant="ghost" size="sm" data-testid="button-view-all-rankings">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {leaderboard && leaderboard.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                {availableGenders.length > 1 && (
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="h-7 w-[100px] text-xs" data-testid="select-leaderboard-gender">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Genders</SelectItem>
                      {availableGenders.map(g => (
                        <SelectItem key={g} value={g!}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {availableCategories.length > 1 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-7 w-[110px] text-xs" data-testid="select-leaderboard-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {availableCategories.map(c => (
                        <SelectItem key={c} value={c!}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(genderFilter !== "ALL" || categoryFilter !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => { setGenderFilter("ALL"); setCategoryFilter("ALL"); }}
                    data-testid="button-clear-leaderboard-filters"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topPlayers.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
                  <div className="text-center">
                    <div className="text-lg font-bold" data-testid="text-filtered-players">{filteredLeaderboard.length}</div>
                    <div className="text-[10px] text-muted-foreground">Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold" data-testid="text-filtered-matches">{totalFilteredMatches}</div>
                    <div className="text-[10px] text-muted-foreground">Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold" data-testid="text-avg-win-rate">{avgWinRate}%</div>
                    <div className="text-[10px] text-muted-foreground">Avg Win Rate</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {topPlayers.map((player, index) => (
                    <Link key={player.id} href={`/all-rankings?playerId=${player.id}`}>
                      <div
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover-elevate ${
                          player.id === playerProfile?.id ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
                        }`}
                        data-testid={`leaderboard-player-${player.id}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          index === 0 ? "bg-amber-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-amber-700 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {player.fullName}
                            {player.id === playerProfile?.id && (
                              <Badge variant="outline" className="ml-2 text-[10px] py-0">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {player.gender && <Badge variant="secondary" className="text-[10px] py-0">{player.gender}</Badge>}
                            <Badge variant="outline" className="text-[10px] py-0">{player.category || "?"}</Badge>
                            <span>{player.matchesPlayed} played</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium">
                            <span className="text-green-600">{player.matchesWon}W</span>
                            <span className="text-muted-foreground mx-0.5">/</span>
                            <span className="text-red-500">{player.matchesLost}L</span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] text-muted-foreground">{player.setsWon}s {player.pointsWon}pts</span>
                            <span className={`text-xs font-bold ${player.winPercentage >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
                              {player.winPercentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {filteredLeaderboard.length > 10 && (
                  <div className="text-center mt-3">
                    <Link href="/all-rankings">
                      <Button variant="ghost" size="sm" className="text-xs" data-testid="button-show-more-players">
                        +{filteredLeaderboard.length - 10} more players <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="text-center py-12">
                <Filter className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">No players match filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting the gender or category filters</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">No ranked players yet</p>
                <p className="text-sm text-muted-foreground mt-1">Complete matches to appear on the leaderboard</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card data-testid="card-upcoming-sessions">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Upcoming Sessions
                </CardTitle>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" data-testid="button-view-all-sessions">
                    All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-lg" />)}
                </div>
              ) : upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.map(session => (
                    <Link key={session.id} href={`/sessions/${session.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover-elevate cursor-pointer" data-testid={`upcoming-session-${session.id}`}>
                        <div className="flex flex-col items-center justify-center w-11 h-11 bg-primary/10 rounded-lg text-primary font-bold shrink-0">
                          <span className="text-[10px] uppercase leading-none">{format(new Date(session.date), "MMM")}</span>
                          <span className="text-lg leading-none">{format(new Date(session.date), "d")}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{session.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {session.startTime}
                            <span className="mx-1">-</span>
                            {session.courtsAvailable} courts
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No upcoming sessions
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10" data-testid="card-create-club">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/20 rounded-lg shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">Start Your Own Club</h3>
                  <p className="text-xs text-muted-foreground">Create and manage your badminton club</p>
                </div>
              </div>
              <Link href="/create-club">
                <Button size="sm" className="w-full mt-3" data-testid="button-create-club">
                  <Plus className="h-4 w-4 mr-1" /> Create Club
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
}
