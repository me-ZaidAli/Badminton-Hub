import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerStatsPopup } from "@/components/PlayerStatsPopup";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Loader2, Users, Trophy, Calendar, Clock, ArrowLeft, Play, CheckCircle, Video, Medal, TrendingUp } from "lucide-react";
import courtImage from "@assets/image_1770246183034.png";

interface PublicSessionData {
  session: any;
  signups: any[];
  matches: any[];
}

export default function PublicSession() {
  const params = useParams();
  const sessionId = Number(params.id);
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [leaderboardStatsId, setLeaderboardStatsId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<PublicSessionData>({
    queryKey: ["/api/public/sessions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/public/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!sessionId,
    refetchInterval: 10000,
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/sessions", sessionId, "leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: !!sessionId,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Session not found or unavailable</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const { session, signups, matches } = data;
  
  const liveMatches = matches.filter((m: any) => m.status === "LIVE");
  const queuedMatches = matches.filter((m: any) => m.status === "QUEUED")
    .sort((a: any, b: any) => (a.queuePosition || 0) - (b.queuePosition || 0));
  const completedMatches = matches.filter((m: any) => m.status === "COMPLETED")
    .sort((a: any, b: any) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 px-4 py-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">{session.matchMode}</Badge>
                <Badge variant="secondary" className={session.status === "UPCOMING" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"}>
                  {session.status}
                </Badge>
              </div>
              <h1 className="text-4xl font-display font-bold mb-2">{session.title}</h1>
              <p className="text-xl text-muted-foreground flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-5 h-5" />
                  {format(new Date(session.date), "EEEE, MMMM do")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-5 h-5" />
                  {session.startTime}
                </span>
              </p>
              {session.liveStreamUrl && (
                <a href={session.liveStreamUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-live-stream">
                    <Video className="w-4 h-4" /> Watch Live Stream
                  </Button>
                </a>
              )}
            </div>

            <Card className="min-w-[280px] border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Players</span>
                  <span className="font-bold">{signups.length} / {session.maxPlayers}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Courts</span>
                  <span className="font-bold">{session.courtsAvailable}</span>
                </div>
                <Link href="/register">
                  <Button className="w-full">Sign Up to Join</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue={completedMatches.length > 0 ? "leaderboard" : "players"} className="w-full">
            <TabsList className="w-full justify-start h-12 bg-muted/50 p-1 flex-wrap gap-1">
              <TabsTrigger value="leaderboard" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-public-leaderboard">
                <Medal className="w-4 h-4 mr-2" /> Leaderboard
              </TabsTrigger>
              <TabsTrigger value="players" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-public-players">
                <Users className="w-4 h-4 mr-2" /> Players ({signups.length})
              </TabsTrigger>
              <TabsTrigger value="matches" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-public-matches">
                <Trophy className="w-4 h-4 mr-2" /> Courts & Matches
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="mt-6" data-testid="content-public-leaderboard">
              {(!leaderboard || leaderboard.length === 0) ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Medal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No results yet</p>
                    <p className="text-sm">The leaderboard will update as matches are completed</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((player: any, index: number) => {
                    const winPct = player.winPercentage || 0;
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer hover-elevate ${
                          index === 0 ? "bg-amber-500/10 border border-amber-500/30" :
                          index === 1 ? "bg-gray-400/10 border border-gray-400/30" :
                          index === 2 ? "bg-amber-700/10 border border-amber-700/30" :
                          "bg-card border border-border/50"
                        }`}
                        onClick={() => setLeaderboardStatsId(player.id)}
                        data-testid={`public-leaderboard-player-${player.id}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          index === 0 ? "bg-amber-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-amber-700 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                          <AvatarFallback>{player.fullName?.charAt(0) || "P"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{player.fullName}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="text-green-600 dark:text-green-400 font-medium">{player.matchesWon}W</span>
                            <span className="text-red-600 dark:text-red-400 font-medium">{player.matchesLost}L</span>
                            <span>{player.matchesPlayed} played</span>
                          </div>
                          <Progress value={winPct} className="h-1.5 mt-1.5" />
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold">{winPct}%</div>
                          <div className="text-xs text-muted-foreground">win rate</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <PlayerStatsPopup 
                profileId={leaderboardStatsId} 
                open={leaderboardStatsId !== null}
                onOpenChange={(open) => !open && setLeaderboardStatsId(null)}
              />
            </TabsContent>

            <TabsContent value="players" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signups.map((signup: any) => (
                  <div 
                    key={signup.id} 
                    className="flex items-center p-4 bg-card rounded-xl border border-border/50 shadow-sm hover-elevate cursor-pointer"
                    onClick={() => setStatsPlayerId(signup.playerId)}
                    data-testid={`public-signup-${signup.id}`}
                  >
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${signup.player.fullName}`} />
                      <AvatarFallback>P</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{signup.player.fullName}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5">Level {signup.player.category}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <PlayerStatsPopup 
                profileId={statsPlayerId} 
                open={statsPlayerId !== null}
                onOpenChange={(open) => !open && setStatsPlayerId(null)}
              />
            </TabsContent>

            <TabsContent value="matches" className="mt-6 space-y-6">
              {liveMatches.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-500" />
                    Live Matches ({liveMatches.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveMatches.map((match: any) => (
                      <Card key={match.id} className="overflow-hidden border-2 border-green-500/30">
                        <div className="bg-green-500/10 p-2 flex items-center justify-between">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-700 animate-pulse">
                            Court {match.courtNumber} - LIVE
                          </Badge>
                        </div>
                        <div 
                          className="p-4 min-h-[120px] bg-cover bg-center bg-no-repeat relative"
                          style={{ backgroundImage: `url(${courtImage})` }}
                        >
                          <div className="relative z-10 flex items-center justify-around h-full">
                            <div className="text-center bg-background/90 rounded-lg px-3 py-2">
                              <p className="text-sm font-semibold">{match.teamAPlayer1?.user?.fullName}</p>
                              {match.teamAPlayer2 && (
                                <p className="text-xs text-muted-foreground">{match.teamAPlayer2?.user?.fullName}</p>
                              )}
                            </div>
                            <div className="bg-white/90 rounded-lg px-3 py-1">
                              <span className="font-bold text-muted-foreground">VS</span>
                            </div>
                            <div className="text-center bg-background/90 rounded-lg px-3 py-2">
                              <p className="text-sm font-semibold">{match.teamBPlayer1?.user?.fullName}</p>
                              {match.teamBPlayer2 && (
                                <p className="text-xs text-muted-foreground">{match.teamBPlayer2?.user?.fullName}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {queuedMatches.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Up Next ({queuedMatches.length} in queue)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[250px]">
                      <div className="space-y-2 p-4">
                        {queuedMatches.map((match: any, index: number) => (
                          <div
                            key={match.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                            data-testid={`public-queue-${match.id}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm">
                                <span className="font-medium">{match.teamAPlayer1?.user?.fullName}</span>
                                {match.teamAPlayer2 && <span className="text-muted-foreground"> & {match.teamAPlayer2?.user?.fullName}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">vs</div>
                              <div className="text-sm">
                                <span className="font-medium">{match.teamBPlayer1?.user?.fullName}</span>
                                {match.teamBPlayer2 && <span className="text-muted-foreground"> & {match.teamBPlayer2?.user?.fullName}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {completedMatches.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-muted-foreground" />
                      Completed Matches ({completedMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 p-4">
                        {completedMatches.map((match: any) => (
                          <div
                            key={match.id}
                            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                            data-testid={`public-completed-${match.id}`}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span>{match.teamAPlayer1?.user?.fullName}{match.teamAPlayer2 && ` & ${match.teamAPlayer2?.user?.fullName}`}</span>
                              <span className="text-muted-foreground">vs</span>
                              <span>{match.teamBPlayer1?.user?.fullName}{match.teamBPlayer2 && ` & ${match.teamBPlayer2?.user?.fullName}`}</span>
                            </div>
                            <Badge variant={(match.scoreA || 0) > (match.scoreB || 0) ? "default" : "secondary"} className="font-mono">
                              {match.scoreA} - {match.scoreB}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {liveMatches.length === 0 && queuedMatches.length === 0 && completedMatches.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No matches yet</p>
                    <p className="text-sm">Matches will appear here once the session starts</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
