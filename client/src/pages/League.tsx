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

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = differenceInSeconds(targetDate, now);
  if (diff <= 0) return <span className="text-red-500 font-bold text-xs animate-pulse" data-testid="badge-live">LIVE</span>;

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;

  let display = "";
  if (days > 0) display = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0) display = `${hours}h ${mins}m ${secs}s`;
  else display = `${mins}m ${secs}s`;

  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground" data-testid="badge-countdown">
      {display}
    </span>
  );
}

function MatchFixtureCard({ match }: { match: any }) {
  const matchDate = new Date(match.matchDatetime);
  const isLive = match.status === "LIVE";

  return (
    <div className="relative" data-testid={`match-card-${match.id}`}>
      <div className="flex items-center py-4 px-3 sm:px-5">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" data-testid={`text-home-team-${match.id}`}>{match.clubName || "Your Club"}</p>
              {match.teamName && <p className="text-[10px] text-muted-foreground">{match.teamName}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center px-3 sm:px-6 min-w-[80px]">
          {isLive ? (
            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded mb-1">LIVE</div>
          ) : (
            <div className="text-[10px] text-muted-foreground mb-0.5">{format(matchDate, "dd MMM").toUpperCase()}</div>
          )}
          <p className="text-lg font-extrabold text-primary tabular-nums" data-testid={`text-time-${match.id}`}>
            {format(matchDate, "HH:mm")}
          </p>
          <CountdownTimer targetDate={matchDate} />
        </div>

        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <div>
              <p className="font-bold text-sm leading-tight" data-testid={`text-opponent-${match.id}`}>{match.opponentClub}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {match.venue && (
        <div className="text-center pb-3 -mt-1">
          <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1" data-testid={`text-venue-${match.id}`}>
            <MapPin className="h-3 w-3" />
            {match.venue}{match.location ? `, ${match.location}` : ""}
          </span>
        </div>
      )}

      {match.playersRevealed && match.players && match.players.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Selected Players</p>
          <div className="flex flex-wrap gap-1.5">
            {match.players.map((p: any) => (
              <Badge key={p.id} variant="secondary" className="text-[11px] font-medium" data-testid={`badge-player-${p.id}`}>
                {p.userName || "Player"} {p.position ? `(${p.position})` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!match.playersRevealed && match.status === "UPCOMING" && (
        <div className="border-t px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground italic flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Lineup revealed 2 hours before match
          </p>
        </div>
      )}
    </div>
  );
}

function MatchResultCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false);
  const matchDate = new Date(match.matchDatetime);
  const outcome = match.result?.outcome;

  const outcomeColor = outcome === "WIN" ? "text-green-600 dark:text-green-400" :
                        outcome === "LOSS" ? "text-red-600 dark:text-red-400" :
                        "text-yellow-600 dark:text-yellow-400";

  const outcomeBg = outcome === "WIN" ? "bg-green-50 dark:bg-green-950/30" :
                    outcome === "LOSS" ? "bg-red-50 dark:bg-red-950/30" :
                    "bg-yellow-50 dark:bg-yellow-950/30";

  return (
    <div className="relative" data-testid={`match-card-${match.id}`}>
      <div className={`flex items-center py-4 px-3 sm:px-5 ${outcomeBg} rounded-t-lg`}>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <p className="font-bold text-sm" data-testid={`text-home-team-${match.id}`}>{match.clubName || "Your Club"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 px-3">
          <span className="text-2xl font-extrabold tabular-nums" data-testid={`text-dragon-score-${match.id}`}>
            {match.result?.dragonScore ?? "-"}
          </span>
          <span className="text-xs font-bold text-muted-foreground">@</span>
          <span className="text-2xl font-extrabold tabular-nums" data-testid={`text-opponent-score-${match.id}`}>
            {match.result?.opponentScore ?? "-"}
          </span>
        </div>

        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <p className="font-bold text-sm" data-testid={`text-opponent-${match.id}`}>{match.opponentClub}</p>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(matchDate, "dd MMM yyyy")}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.venue}
            </span>
          )}
        </div>
        <span className={`font-bold text-xs ${outcomeColor}`}>
          {outcome === "WIN" ? "Victory" : outcome === "LOSS" ? "Defeat" : "Draw"}
        </span>
      </div>

      {match.result?.gameScores && match.result.gameScores.length > 0 && (
        <div className="border-t px-4 py-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline w-full justify-center py-1"
            data-testid={`button-expand-scores-${match.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} Game Scores
          </button>
          {expanded && (
            <div className="mt-1 space-y-1 pb-2">
              {match.result.gameScores.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30" data-testid={`game-score-${g.id}`}>
                  <span className="text-muted-foreground font-medium">Game {g.gameNumber}</span>
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

function StatRow({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-lg font-extrabold tabular-nums">{value}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Swords className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-league-title">LEAGUE</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fixtures & Results</p>
          </div>
        </div>
        {userClubs.length > 1 && (
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-48" data-testid="select-club-filter">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {userClubs.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-11" data-testid="league-tabs">
          <TabsTrigger value="matches" className="text-xs sm:text-sm font-semibold" data-testid="tab-matches">
            Matches
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs sm:text-sm font-semibold" data-testid="tab-results">
            Results
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs sm:text-sm font-semibold" data-testid="tab-stats">
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-5 space-y-5">
          {upcomingLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groupedUpcoming.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-base" data-testid="text-no-upcoming">No Upcoming Fixtures</p>
                <p className="text-sm text-muted-foreground mt-1">Check back later for new matches</p>
              </CardContent>
            </Card>
          ) : (
            groupedUpcoming.map(([dateKey, matches]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                    {format(new Date(dateKey), "EEEE, dd MMMM")}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {matches.map((m: any) => (
                    <Card key={m.id} className="overflow-hidden border-border/60">
                      <MatchFixtureCard match={m} />
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-5 space-y-5">
          {resultsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groupedResults.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-base" data-testid="text-no-results">No Results Yet</p>
                <p className="text-sm text-muted-foreground mt-1">Completed match results will appear here</p>
              </CardContent>
            </Card>
          ) : (
            groupedResults.map(([dateKey, matches]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                    {format(new Date(dateKey), "dd MMMM yyyy")}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {matches.map((m: any) => (
                    <Card key={m.id} className="overflow-hidden border-border/60">
                      <MatchResultCard match={m} />
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-5 space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-primary px-5 py-4">
              <h3 className="font-extrabold text-primary-foreground text-base uppercase tracking-wide">Season Stats</h3>
            </div>
            <CardContent className="p-5">
              <StatRow label="Games Played" value={stats.total} icon={<Swords className="h-4 w-4" />} />
              <StatRow label="Upcoming" value={stats.upcoming} icon={<Calendar className="h-4 w-4" />} />
              <StatRow label="Wins" value={stats.wins} icon={<TrendingUp className="h-4 w-4 text-green-500" />} />
              <StatRow label="Losses" value={stats.losses} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
              <StatRow label="Draws" value={stats.draws} icon={<Minus className="h-4 w-4 text-yellow-500" />} />
              <StatRow label="Win Rate" value={`${stats.winRate}%`} icon={<BarChart3 className="h-4 w-4" />} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="bg-primary px-5 py-4">
              <h3 className="font-extrabold text-primary-foreground text-base uppercase tracking-wide">Scoring</h3>
            </div>
            <CardContent className="p-5">
              <StatRow label="Total Points Scored" value={stats.totalPoints} icon={<TrendingUp className="h-4 w-4 text-green-500" />} />
              <StatRow label="Total Points Conceded" value={stats.totalConceded} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
              <StatRow label="Point Difference" value={stats.totalPoints - stats.totalConceded} icon={<BarChart3 className="h-4 w-4" />} />
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-muted-foreground">Recent Form</h4>
                <div className="flex items-center gap-1.5">
                  {results.slice(0, 10).reverse().map((m: any, idx: number) => {
                    const o = m.result?.outcome;
                    const bg = o === "WIN" ? "bg-green-500" : o === "LOSS" ? "bg-red-500" : "bg-yellow-500";
                    const letter = o === "WIN" ? "W" : o === "LOSS" ? "L" : "D";
                    return (
                      <div key={idx} className={`${bg} w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold`} data-testid={`form-indicator-${idx}`}>
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
  );
}
