import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { useQuery } from "@tanstack/react-query";
import { useClubs, useSessionLeaderboard } from "@/hooks/use-clubs";
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
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";

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

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
  });

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

  const myUpcomingSessions = useMemo(() => {
    if (!mySessions) return [];
    return mySessions
      .filter(s => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE")
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
      .slice(0, 5);
  }, [mySessions]);

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4" data-testid="stats-grid">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-total-sessions">{totalSessionsCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{upcomingSessionsCount} upcoming</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">My Sessions</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-my-sessions-count">{mySessions?.length || 0}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">signed up</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-upcoming-count">{upcomingSessionsCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">sessions ahead</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Played</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-2xl sm:text-3xl font-bold" data-testid="text-sessions-played">{pastSessionsCount}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">completed</div>
          </CardContent>
        </Card>
      </div>

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
                <Link key={session.sessionId} href={`/sessions/${session.sessionId}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover-elevate cursor-pointer" data-testid={`my-upcoming-session-${session.sessionId}`}>
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
                </Link>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
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

      <PlayerStatsDialog
        profileId={statsPlayerId}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </div>
  );
}
