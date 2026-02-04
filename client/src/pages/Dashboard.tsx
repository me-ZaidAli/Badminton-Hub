import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { useLeaderboard } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, Trophy, Zap, Target, TrendingUp, Info, Building2, Plus } from "lucide-react";

export default function Dashboard() {
  const { data: user } = useUser();
  const { data: sessions, isLoading } = useSessions();
  const clubId = user?.playerProfile?.clubId;
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(clubId ?? null);

  const stats = [
    { label: "Matches Played", value: user?.playerProfile?.matchesPlayed || 0, icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Matches Won", value: user?.playerProfile?.matchesWon || 0, icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Rank Points", value: user?.playerProfile?.rankingPoints || 1000, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const upcomingSessions = sessions?.filter(s => new Date(s.date) > new Date()).slice(0, 3);
  const topPlayers = leaderboard?.slice(0, 5) || [];
  
  const totalClubMatches = leaderboard?.reduce((sum, p) => sum + p.matchesPlayed, 0) || 0;

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Welcome back, ${user?.fullName.split(' ')[0]}!`}
        description="Here's what's happening at the club today."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">+2.5% from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard with Court Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 overflow-hidden" data-testid="card-leaderboard">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Club Leaderboard
              </CardTitle>
              <Link href="/rankings">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <CardDescription>Top 5 players by ranking points</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative bg-green-600 p-4 min-h-[280px]">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[2px] h-full bg-white/30" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/30 pointer-events-none" />
              <div className="absolute top-2 bottom-2 left-2 right-2 border-2 border-white/40 pointer-events-none" />
              <div className="absolute top-2 bottom-2 left-2 right-[calc(50%-1px)] border-r-0 border-2 border-white/20 pointer-events-none" />
              <div className="absolute top-2 bottom-2 right-2 left-[calc(50%+1px)] border-l-0 border-2 border-white/20 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 py-4">
                {leaderboardLoading ? (
                  <div className="text-white/80 text-sm">Loading...</div>
                ) : topPlayers.length > 0 ? (
                  topPlayers.map((player, index) => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-3 bg-background/95 rounded-lg px-4 py-2 shadow-lg w-full max-w-xs"
                      data-testid={`leaderboard-player-${player.id}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-amber-500 text-white" : 
                        index === 1 ? "bg-gray-400 text-white" : 
                        index === 2 ? "bg-amber-700 text-white" : 
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{player.fullName}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs py-0">{player.category || "?"}</Badge>
                          <span>{player.matchesWon}W / {player.matchesPlayed}P</span>
                        </div>
                      </div>
                      <div className="text-right font-bold text-primary">{player.rankingPoints}</div>
                    </div>
                  ))
                ) : (
                  <div className="bg-background/90 rounded-lg px-6 py-4 text-center">
                    <p className="text-muted-foreground">No players ranked yet</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50" data-testid="card-match-stats">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Match Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{totalClubMatches}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Club Matches</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-500">{leaderboard?.length || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Active Players</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50" data-testid="card-ranking-info">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-500" />
                How Rankings Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our ranking system uses an Elo-based point system. Every player starts at 1000 points. 
                When you win a match, you gain points based on your opponent's strength - beating higher-ranked 
                players earns more points. Losing to lower-ranked players costs more points. Your category 
                (A, B, C, D) is determined by your point total: A (1400+), B (1200-1399), C (1000-1199), D (below 1000). 
                To move up, consistently win matches, especially against stronger opponents. Stay active - 
                the more you play, the more opportunities to climb the rankings!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upcoming Sessions</h2>
          <Link href="/sessions">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4">
            {upcomingSessions?.map((session) => (
              <Card key={session.id} className="group hover-elevate cursor-pointer border-border/50">
                <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-xl text-primary font-bold">
                      <span className="text-xs uppercase">{format(new Date(session.date), "MMM")}</span>
                      <span className="text-2xl">{format(new Date(session.date), "d")}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{session.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {session.startTime}
                        </span>
                        <span>•</span>
                        <span>{session.courtsAvailable} Courts</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/sessions/${session.id}`}>
                    <Button>Join Session</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {(!upcomingSessions || upcomingSessions.length === 0) && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Your Own Club */}
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="card-create-club">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Start Your Own Club</h3>
              <p className="text-sm text-muted-foreground">Create a badminton club and invite players to join</p>
            </div>
          </div>
          <Link href="/create-club">
            <Button data-testid="button-create-club">
              <Plus className="h-4 w-4 mr-2" />
              Create Club
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
