import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, MapPin, Clock, Trophy, Users, Shield, ChevronDown, ChevronUp, Swords } from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture, differenceInSeconds } from "date-fns";
import { useEffect } from "react";

function CountdownBadge({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = differenceInSeconds(targetDate, now);
  if (diff <= 0) return <Badge variant="destructive" data-testid="badge-live">LIVE</Badge>;

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;

  let display = "";
  if (days > 0) display = `${days}d ${hours}h`;
  else if (hours > 0) display = `${hours}h ${mins}m`;
  else display = `${mins}m ${secs}s`;

  return (
    <Badge variant="outline" className="font-mono text-xs tabular-nums" data-testid="badge-countdown">
      <Clock className="h-3 w-3 mr-1" />
      {display}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "LIVE") return <Badge className="bg-red-500 text-white animate-pulse" data-testid="badge-status-live">LIVE</Badge>;
  if (status === "COMPLETED") return <Badge variant="secondary" data-testid="badge-status-completed">COMPLETED</Badge>;
  return <Badge variant="outline" className="text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700" data-testid="badge-status-upcoming">UPCOMING</Badge>;
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    MENS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    LADIES: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    MIXED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return <Badge className={colors[category] || ""} data-testid={`badge-category-${category}`}>{category}</Badge>;
}

function MatchCard({ match, isResult }: { match: any; isResult?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const matchDate = new Date(match.matchDatetime);

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`match-card-${match.id}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={match.status} />
            <CategoryBadge category={match.category} />
            {match.division && (
              <Badge variant="outline" className="text-xs" data-testid={`badge-division-${match.id}`}>{match.division}</Badge>
            )}
          </div>
          {match.status === "UPCOMING" && <CountdownBadge targetDate={matchDate} />}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <p className="font-bold text-sm mt-1" data-testid={`text-home-team-${match.id}`}>{match.clubName || "Your Club"}</p>
            {match.teamName && <p className="text-xs text-muted-foreground">{match.teamName}</p>}
          </div>

          {match.result ? (
            <div className="text-center px-4 py-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums" data-testid={`text-dragon-score-${match.id}`}>{match.result.dragonScore}</span>
                <Swords className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold tabular-nums" data-testid={`text-opponent-score-${match.id}`}>{match.result.opponentScore}</span>
              </div>
              <OutcomeBadge outcome={match.result.outcome} />
            </div>
          ) : (
            <div className="text-center px-4 py-2">
              <p className="text-lg font-bold text-muted-foreground">vs</p>
            </div>
          )}

          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-bold text-sm mt-1" data-testid={`text-opponent-${match.id}`}>{match.opponentClub}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1" data-testid={`text-date-${match.id}`}>
            <Calendar className="h-3.5 w-3.5" />
            {format(matchDate, "EEE, dd MMM yyyy")}
          </span>
          <span className="flex items-center gap-1" data-testid={`text-time-${match.id}`}>
            <Clock className="h-3.5 w-3.5" />
            {format(matchDate, "HH:mm")}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1" data-testid={`text-venue-${match.id}`}>
              <MapPin className="h-3.5 w-3.5" />
              {match.venue}{match.location ? `, ${match.location}` : ""}
            </span>
          )}
        </div>

        {match.playersRevealed && match.players && match.players.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" /> Selected Players
            </p>
            <div className="flex flex-wrap gap-1.5">
              {match.players.map((p: any) => (
                <Badge key={p.id} variant="secondary" className="text-xs" data-testid={`badge-player-${p.id}`}>
                  {p.userName || "Player"} {p.position ? `(${p.position})` : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!match.playersRevealed && match.status === "UPCOMING" && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground italic flex items-center gap-1">
              <Shield className="h-3 w-3" /> Player lineup will be revealed 2 hours before match
            </p>
          </div>
        )}

        {match.result?.gameScores && match.result.gameScores.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              data-testid={`button-expand-scores-${match.id}`}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} Game Scores
            </button>
            {expanded && (
              <div className="mt-2 space-y-1">
                {match.result.gameScores.map((g: any) => (
                  <div key={g.id} className="flex items-center gap-3 text-xs" data-testid={`game-score-${g.id}`}>
                    <span className="text-muted-foreground w-16">Game {g.gameNumber}</span>
                    <span className="font-medium tabular-nums">{g.dragonPoints} - {g.opponentPoints}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "WIN") return <Badge className="bg-green-600 text-white text-[10px] mt-1">WIN</Badge>;
  if (outcome === "LOSS") return <Badge className="bg-red-600 text-white text-[10px] mt-1">LOSS</Badge>;
  return <Badge className="bg-yellow-600 text-white text-[10px] mt-1">DRAW</Badge>;
}

export default function LeaguePage() {
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("upcoming");
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
    return { total: results.length, wins, losses, draws, upcoming: upcoming.length };
  }, [results, upcoming]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-league-title">League</h1>
          <p className="text-muted-foreground text-sm">Fixtures, results, and match details</p>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="stat-upcoming">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.upcoming}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-wins">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-losses">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
            <p className="text-xs text-muted-foreground">Losses</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-draws">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.draws}</p>
            <p className="text-xs text-muted-foreground">Draws</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2" data-testid="league-tabs">
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            <Calendar className="h-4 w-4 mr-1.5" />
            Upcoming ({stats.upcoming})
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <Trophy className="h-4 w-4 mr-1.5" />
            Results ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-6">
          {upcomingLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groupedUpcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground" data-testid="text-no-upcoming">No upcoming fixtures</p>
              </CardContent>
            </Card>
          ) : (
            groupedUpcoming.map(([dateKey, matches]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {format(new Date(dateKey), "EEEE, dd MMMM yyyy")}
                </h3>
                <div className="space-y-3">
                  {matches.map((m: any) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-4 space-y-6">
          {resultsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groupedResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground" data-testid="text-no-results">No results yet</p>
              </CardContent>
            </Card>
          ) : (
            groupedResults.map(([dateKey, matches]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {format(new Date(dateKey), "EEEE, dd MMMM yyyy")}
                </h3>
                <div className="space-y-3">
                  {matches.map((m: any) => (
                    <MatchCard key={m.id} match={m} isResult />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}