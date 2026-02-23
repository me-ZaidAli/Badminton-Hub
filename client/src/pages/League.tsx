import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, MapPin, Clock, Trophy, Users, Shield, ChevronDown, ChevronUp, Swords, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { useEffect } from "react";
import heroBg from "@assets/UNI_T_PROMOTIONAL_VIDEO_20260223_225338_0000_1771887239418.png";

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = differenceInSeconds(targetDate, now);
  if (diff <= 0) return <span className="text-red-500 font-bold text-[10px] animate-pulse" data-testid="badge-live">LIVE</span>;

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;

  let display = "";
  if (days > 0) display = `${days}d ${hours}h`;
  else if (hours > 0) display = `${hours}h ${mins}m`;
  else display = `${mins}m ${secs}s`;

  return (
    <span className="font-mono text-[10px] tabular-nums text-muted-foreground" data-testid="badge-countdown">
      {display}
    </span>
  );
}

function MatchFixtureRow({ match }: { match: any }) {
  const matchDate = new Date(match.matchDatetime);
  const isLive = match.status === "LIVE";

  return (
    <div data-testid={`match-card-${match.id}`}>
      <div className="flex items-center py-3.5 px-2 sm:px-4">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-2 self-stretch rounded-full bg-[#1a3a5c] dark:bg-[#3b82f6] shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#1a3a5c]/10 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Shield className="h-3.5 w-3.5 text-[#1a3a5c] dark:text-blue-400" />
            </div>
            <p className="font-bold text-xs sm:text-sm uppercase truncate" data-testid={`text-home-team-${match.id}`}>
              {match.clubName || "Your Club"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center px-2 sm:px-4 shrink-0">
          {isLive ? (
            <div className="bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-sm mb-0.5">LIVE</div>
          ) : null}
          <p className="text-base sm:text-lg font-extrabold text-[#c0392b] dark:text-red-400 tabular-nums leading-none" data-testid={`text-time-${match.id}`}>
            {format(matchDate, "HH:mm")}
          </p>
          <span className="text-[9px] text-muted-foreground font-medium mt-0.5">
            {format(matchDate, "dd MMM").toUpperCase()}
          </span>
          <CountdownTimer targetDate={matchDate} />
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <p className="font-bold text-xs sm:text-sm uppercase truncate text-right" data-testid={`text-opponent-${match.id}`}>
              {match.opponentClub}
            </p>
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className="w-2 self-stretch rounded-full bg-muted-foreground/20 shrink-0" />
        </div>
      </div>

      {match.venue && (
        <div className="text-center pb-2 -mt-1">
          <span className="text-[10px] text-muted-foreground" data-testid={`text-venue-${match.id}`}>
            {match.venue}{match.location ? `, ${match.location}` : ""}
          </span>
        </div>
      )}

      {match.playersRevealed && match.players && match.players.length > 0 && (
        <div className="border-t border-dashed px-4 py-2.5">
          <div className="flex flex-wrap gap-1">
            {match.players.map((p: any) => (
              <Badge key={p.id} variant="secondary" className="text-[10px] font-medium py-0.5" data-testid={`badge-player-${p.id}`}>
                {p.userName || "Player"} {p.position ? `(${p.position})` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!match.playersRevealed && match.status === "UPCOMING" && (
        <div className="border-t border-dashed px-4 py-2">
          <p className="text-[10px] text-muted-foreground italic text-center">
            Lineup revealed 2h before match
          </p>
        </div>
      )}
    </div>
  );
}

function MatchResultRow({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const matchDate = new Date(match.matchDatetime);
  const outcome = match.result?.outcome;

  return (
    <div data-testid={`match-card-${match.id}`}>
      <div className="flex items-center py-3.5 px-2 sm:px-4">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className={`w-2 self-stretch rounded-full shrink-0 ${outcome === "WIN" ? "bg-green-500" : outcome === "LOSS" ? "bg-red-500" : "bg-yellow-500"}`} />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#1a3a5c]/10 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Shield className="h-3.5 w-3.5 text-[#1a3a5c] dark:text-blue-400" />
            </div>
            <p className="font-bold text-xs sm:text-sm uppercase truncate" data-testid={`text-home-team-${match.id}`}>
              {match.clubName || "Your Club"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 shrink-0">
          <span className="text-xl sm:text-2xl font-extrabold tabular-nums" data-testid={`text-dragon-score-${match.id}`}>
            {match.result?.dragonScore ?? "-"}
          </span>
          <span className="text-[10px] font-bold text-[#c0392b] dark:text-red-400">@</span>
          <span className="text-xl sm:text-2xl font-extrabold tabular-nums" data-testid={`text-opponent-score-${match.id}`}>
            {match.result?.opponentScore ?? "-"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <p className="font-bold text-xs sm:text-sm uppercase truncate text-right" data-testid={`text-opponent-${match.id}`}>
              {match.opponentClub}
            </p>
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className={`w-2 self-stretch rounded-full shrink-0 ${outcome === "WIN" ? "bg-green-500" : outcome === "LOSS" ? "bg-red-500" : "bg-yellow-500"}`} />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 text-[10px] text-muted-foreground">
        <span>{match.venue || format(matchDate, "dd MMM yyyy")}</span>
        <span className={`font-bold ${outcome === "WIN" ? "text-green-600 dark:text-green-400" : outcome === "LOSS" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>
          Result: {outcome === "WIN" ? "Victory" : outcome === "LOSS" ? "Defeat" : "Draw"}
        </span>
      </div>

      {match.result?.gameScores && match.result.gameScores.length > 0 && (
        <div className="border-t border-dashed px-4 py-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-primary font-semibold w-full justify-center py-0.5"
            data-testid={`button-expand-scores-${match.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} Game Scores
          </button>
          {expanded && (
            <div className="mt-1 space-y-1 pb-1">
              {match.result.gameScores.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-muted/40" data-testid={`game-score-${g.id}`}>
                  <span className="text-muted-foreground">Game {g.gameNumber}</span>
                  <span className="font-bold tabular-nums">{g.dragonPoints} - {g.opponentPoints}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

export default function LeaguePage() {
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("matches");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");

  const { data: profilesData } = useQuery<any[]>({
    queryKey: ["/api/player-profiles"],
    enabled: !!user,
  });

  const clubIds = useMemo(() => {
    if (!profilesData) return [];
    return profilesData.map((p: any) => p.clubId);
  }, [profilesData]);

  const { data: upcomingMatches, isLoading: upcomingLoading } = useQuery<any[]>({
    queryKey: ["/api/league/matches", { view: "upcoming", clubId: selectedClubId !== "all" ? selectedClubId : "" }],
    queryFn: async () => {
      const params = new URLSearchParams({ view: "upcoming" });
      if (selectedClubId !== "all") params.set("clubId", selectedClubId);
      const res = await fetch(`/api/league/matches?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: resultMatches, isLoading: resultsLoading } = useQuery<any[]>({
    queryKey: ["/api/league/matches", { view: "results", clubId: selectedClubId !== "all" ? selectedClubId : "" }],
    queryFn: async () => {
      const params = new URLSearchParams({ view: "results" });
      if (selectedClubId !== "all") params.set("clubId", selectedClubId);
      const res = await fetch(`/api/league/matches?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
    enabled: !!user,
  });

  const userClubs = useMemo(() => {
    if (!clubs || !profilesData) return [];
    return clubs.filter((c: any) => clubIds.includes(c.id));
  }, [clubs, profilesData, clubIds]);

  const upcoming = upcomingMatches || [];
  const results = resultMatches || [];

  const groupedUpcoming = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const m of upcoming) {
      const key = format(new Date(m.matchDatetime), "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const m of results) {
      const key = format(new Date(m.matchDatetime), "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [results]);

  const stats = useMemo(() => {
    const wins = results.filter((m: any) => m.result?.outcome === "WIN").length;
    const losses = results.filter((m: any) => m.result?.outcome === "LOSS").length;
    const draws = results.filter((m: any) => m.result?.outcome === "DRAW").length;
    const totalPoints = results.reduce((acc: number, m: any) => acc + (m.result?.dragonScore || 0), 0);
    const totalConceded = results.reduce((acc: number, m: any) => acc + (m.result?.opponentScore || 0), 0);
    const winRate = results.length > 0 ? Math.round((wins / results.length) * 100) : 0;
    return { total: results.length, wins, losses, draws, upcoming: upcoming.length, totalPoints, totalConceded, winRate };
  }, [results, upcoming]);

  const selectedClubName = useMemo(() => {
    if (selectedClubId === "all") return null;
    const club = userClubs.find((c: any) => String(c.id) === selectedClubId);
    return club?.name || null;
  }, [selectedClubId, userClubs]);

  return (
    <div className="space-y-0 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="relative h-[320px] sm:h-[380px] overflow-hidden" data-testid="league-hero">
        <img
          src={heroBg}
          alt="Badminton League"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-none" data-testid="text-league-title">
            BADMINTON
            <br />
            LEAGUE
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-2 max-w-md">
            Competitive matches, fierce rivalries, and the pursuit of excellence.
          </p>
          {userClubs.length > 1 && (
            <div className="mt-4">
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="w-52 bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-club-filter">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {userClubs.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-6 space-y-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-11 bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/40" data-testid="league-tabs">
            <TabsTrigger
              value="matches"
              className="text-xs sm:text-sm font-bold uppercase tracking-wide data-[state=active]:bg-[#1a3a5c] data-[state=active]:text-white"
              data-testid="tab-matches"
            >
              Matches
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="text-xs sm:text-sm font-bold uppercase tracking-wide data-[state=active]:bg-[#1a3a5c] data-[state=active]:text-white"
              data-testid="tab-results"
            >
              Results
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="text-xs sm:text-sm font-bold uppercase tracking-wide data-[state=active]:bg-[#1a3a5c] data-[state=active]:text-white"
              data-testid="tab-stats"
            >
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold uppercase tracking-tight" data-testid="text-matches-header">
                {selectedClubName ? selectedClubName : "Matches"}
              </h2>
              <span className="text-xs text-muted-foreground">{upcoming.length} upcoming</span>
            </div>

            {upcomingLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : upcoming.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#1a3a5c]/10 dark:bg-blue-900/20 mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-[#1a3a5c] dark:text-blue-400" />
                  </div>
                  <p className="font-bold text-sm" data-testid="text-no-upcoming">No Upcoming Fixtures</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back later for new matches</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {groupedUpcoming.map(([dateKey, matches]) => (
                  <div key={dateKey}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 pl-1">
                      {format(new Date(dateKey), "EEEE, dd MMMM")}
                    </p>
                    <Card className="overflow-hidden divide-y divide-border/50">
                      {matches.map((m: any) => (
                        <MatchFixtureRow key={m.id} match={m} />
                      ))}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold uppercase tracking-tight" data-testid="text-results-header">Results</h2>
              <span className="text-xs text-muted-foreground">{results.length} played</span>
            </div>

            {resultsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#1a3a5c]/10 dark:bg-blue-900/20 mx-auto mb-3 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-[#1a3a5c] dark:text-blue-400" />
                  </div>
                  <p className="font-bold text-sm" data-testid="text-no-results">No Results Yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Completed match results will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {groupedResults.map(([dateKey, matches]) => (
                  <div key={dateKey}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 pl-1">
                      {format(new Date(dateKey), "dd MMMM yyyy")}
                    </p>
                    <Card className="overflow-hidden divide-y divide-border/50">
                      {matches.map((m: any) => (
                        <MatchResultRow key={m.id} match={m} />
                      ))}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-5 space-y-4">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Season Stats</h2>

            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <StatRow label="Games Played" value={stats.total} />
                <StatRow label="Games Started" value={stats.total} />
                <StatRow label="Wins" value={String(stats.wins).padStart(2, "0")} />
                <StatRow label="Losses" value={String(stats.losses).padStart(2, "0")} />
                <StatRow label="Draws" value={String(stats.draws).padStart(2, "0")} />
                <StatRow label="Win Rate" value={`${stats.winRate}%`} />
                <StatRow label="Total Points" value={stats.totalPoints} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="bg-[#1a3a5c] px-5 py-3">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Scoring</h3>
              </div>
              <CardContent className="p-5">
                <StatRow label="Points Scored" value={stats.totalPoints} />
                <StatRow label="Points Conceded" value={stats.totalConceded} />
                <StatRow label="Point Difference" value={stats.totalPoints - stats.totalConceded} />
              </CardContent>
            </Card>

            {results.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h4 className="font-bold text-xs mb-4 uppercase tracking-widest text-muted-foreground">Recent Form</h4>
                  <div className="flex items-center gap-2">
                    {results.slice(0, 10).reverse().map((m: any, idx: number) => {
                      const o = m.result?.outcome;
                      const bg = o === "WIN" ? "bg-green-500" : o === "LOSS" ? "bg-red-500" : "bg-yellow-500";
                      const letter = o === "WIN" ? "W" : o === "LOSS" ? "L" : "D";
                      return (
                        <div key={idx} className={`${bg} w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold`} data-testid={`form-indicator-${idx}`}>
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
