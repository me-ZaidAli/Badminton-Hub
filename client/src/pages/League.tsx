import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, MapPin, Trophy, Users, Shield, ChevronDown, ChevronUp, Swords, BarChart3, TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
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

function CategoryPill({ category, active, onClick }: { category: string; active: boolean; onClick: () => void }) {
  const colors: Record<string, string> = {
    ALL: active ? "bg-[#1a3a5c] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80",
    MENS: active ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30",
    LADIES: active ? "bg-pink-600 text-white" : "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/30",
    MIXED: active ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30",
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${colors[category] || colors.ALL}`}
      data-testid={`filter-category-${category.toLowerCase()}`}
    >
      {category === "ALL" ? "All" : category}
    </button>
  );
}

function MatchFixtureRow({ match, expanded, onToggle }: { match: any; expanded: boolean; onToggle: () => void }) {
  const matchDate = new Date(match.matchDatetime);
  const isLive = match.status === "LIVE";

  return (
    <div data-testid={`match-card-${match.id}`} className="cursor-pointer" onClick={onToggle}>
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

      <div className="text-center pb-2 -mt-1 flex items-center justify-center gap-2">
        {match.location && (
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${match.location === "HOME" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`} data-testid={`badge-location-${match.id}`}>
            {match.location}
          </span>
        )}
        {match.venue && (
          <span className="text-[10px] text-muted-foreground" data-testid={`text-venue-${match.id}`}>
            {match.venue}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">{match.division}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {expanded && (
        <div className="border-t border-dashed px-4 py-3 space-y-3 bg-muted/20" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Format</p>
              <p className="text-xs font-bold">{match.pairsCount || 3} Pairs, Best of {match.setsPerPair || 3}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Category</p>
              <Badge className={`text-[10px] ${match.category === "MENS" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : match.category === "LADIES" ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                {match.category}
              </Badge>
            </div>
          </div>

          {match.venue && (
            <div className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{match.venue}</span>
            </div>
          )}

          {match.playersRevealed && match.players && match.players.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Lineup</p>
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
            <p className="text-[10px] text-muted-foreground italic text-center">
              Lineup revealed 2h before match
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MatchResultRow({ match, expanded, onToggle }: { match: any; expanded: boolean; onToggle: () => void }) {
  const matchDate = new Date(match.matchDatetime);
  const outcome = match.result?.outcome;

  const gameScores = match.result?.gameScores || [];
  const pairsCount = match.pairsCount || 3;

  const groupedByPair = useMemo(() => {
    if (gameScores.length === 0) return [];
    const pairs: Record<number, any[]> = {};
    for (const g of gameScores) {
      const pn = g.pairNumber || 1;
      if (!pairs[pn]) pairs[pn] = [];
      pairs[pn].push(g);
    }
    return Object.entries(pairs).sort(([a], [b]) => Number(a) - Number(b));
  }, [gameScores]);

  return (
    <div data-testid={`match-card-${match.id}`} className="cursor-pointer" onClick={onToggle}>
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
        <div className="flex items-center gap-2">
          {match.location && (
            <span className={`font-bold uppercase px-1.5 py-0.5 rounded ${match.location === "HOME" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
              {match.location}
            </span>
          )}
          <span>{match.division} - {format(matchDate, "dd MMM yyyy")}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
        <span className={`font-bold ${outcome === "WIN" ? "text-green-600 dark:text-green-400" : outcome === "LOSS" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>
          {outcome === "WIN" ? "Victory" : outcome === "LOSS" ? "Defeat" : "Draw"}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-dashed px-4 py-3 space-y-3 bg-muted/20" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Format</p>
              <p className="text-xs font-bold">{pairsCount} Pairs</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Category</p>
              <Badge className={`text-[10px] ${match.category === "MENS" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : match.category === "LADIES" ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                {match.category}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Sets</p>
              <p className="text-xs font-bold">Best of {match.setsPerPair || 3}</p>
            </div>
          </div>

          {match.venue && (
            <div className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{match.venue}</span>
            </div>
          )}

          {groupedByPair.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Pair Scores</p>
              {groupedByPair.map(([pairNum, games]) => (
                <div key={pairNum} className="bg-muted/40 rounded-lg p-2">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">Pair {pairNum}</p>
                  <div className="space-y-1">
                    {(games as any[]).sort((a, b) => a.gameNumber - b.gameNumber).map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between text-[11px] px-2 py-0.5" data-testid={`game-score-${g.id}`}>
                        <span className="text-muted-foreground">Set {g.gameNumber}</span>
                        <span className={`font-bold tabular-nums ${g.dragonPoints > g.opponentPoints ? "text-green-600 dark:text-green-400" : g.dragonPoints < g.opponentPoints ? "text-red-600 dark:text-red-400" : ""}`}>
                          {g.dragonPoints} - {g.opponentPoints}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {gameScores.length === 0 && groupedByPair.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic text-center">No detailed scores available</p>
          )}

          {match.players && match.players.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Players</p>
              <div className="flex flex-wrap gap-1">
                {match.players.map((p: any) => (
                  <Badge key={p.id} variant="secondary" className="text-[10px] font-medium py-0.5" data-testid={`badge-player-${p.id}`}>
                    {p.userName || "Player"} {p.position ? `(${p.position})` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, icon }: { label: string; value: string | number; icon?: any }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function DivisionBreakdown({ results }: { results: any[] }) {
  const divisionStats = useMemo(() => {
    const stats: Record<string, { wins: number; losses: number; draws: number; pf: number; pa: number; category: string }> = {};
    for (const m of results) {
      const div = m.division || "Unknown";
      if (!stats[div]) stats[div] = { wins: 0, losses: 0, draws: 0, pf: 0, pa: 0, category: m.category };
      if (m.result?.outcome === "WIN") stats[div].wins++;
      else if (m.result?.outcome === "LOSS") stats[div].losses++;
      else stats[div].draws++;
      stats[div].pf += m.result?.dragonScore || 0;
      stats[div].pa += m.result?.opponentScore || 0;
    }
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
  }, [results]);

  if (divisionStats.length === 0) return null;

  const catColors: Record<string, string> = {
    MENS: "border-l-blue-500",
    LADIES: "border-l-pink-500",
    MIXED: "border-l-purple-500",
  };

  return (
    <div className="space-y-3">
      {divisionStats.map(([div, s]) => (
        <Card key={div} className={`overflow-hidden border-l-4 ${catColors[s.category] || "border-l-gray-500"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm">{div}</h4>
                <Badge className={`text-[9px] mt-0.5 ${s.category === "MENS" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : s.category === "LADIES" ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                  {s.category}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{s.wins + s.losses + s.draws} Played</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2">
                <p className="text-lg font-extrabold text-green-600 dark:text-green-400">{s.wins}</p>
                <p className="text-[9px] text-green-600/70 dark:text-green-400/70 uppercase font-bold">Won</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2">
                <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{s.losses}</p>
                <p className="text-[9px] text-red-600/70 dark:text-red-400/70 uppercase font-bold">Lost</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-2">
                <p className="text-lg font-extrabold text-yellow-600 dark:text-yellow-400">{s.draws}</p>
                <p className="text-[9px] text-yellow-600/70 dark:text-yellow-400/70 uppercase font-bold">Draw</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-muted-foreground">Points: <span className="font-bold text-foreground">{s.pf}</span> scored, <span className="font-bold text-foreground">{s.pa}</span> conceded</span>
              <span className={`font-bold ${s.pf - s.pa > 0 ? "text-green-600" : s.pf - s.pa < 0 ? "text-red-600" : "text-yellow-600"}`}>
                {s.pf - s.pa > 0 ? "+" : ""}{s.pf - s.pa}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LeaguePage() {
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("matches");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);

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

  const allUpcoming = upcomingMatches || [];
  const allResults = resultMatches || [];

  const divisions = useMemo(() => {
    const all = [...allUpcoming, ...allResults];
    const divs = new Set<string>();
    for (const m of all) {
      if (m.division) divs.add(m.division);
    }
    return Array.from(divs).sort();
  }, [allUpcoming, allResults]);

  const filterMatches = (matches: any[]) => {
    let filtered = matches;
    if (selectedCategory !== "ALL") {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    if (selectedDivision !== "all") {
      filtered = filtered.filter(m => m.division === selectedDivision);
    }
    return filtered;
  };

  const upcoming = filterMatches(allUpcoming);
  const results = filterMatches(allResults);

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
    const homeWins = results.filter((m: any) => m.location === "HOME" && m.result?.outcome === "WIN").length;
    const awayWins = results.filter((m: any) => m.location === "AWAY" && m.result?.outcome === "WIN").length;
    const homeMatches = results.filter((m: any) => m.location === "HOME").length;
    const awayMatches = results.filter((m: any) => m.location === "AWAY").length;
    return { total: results.length, wins, losses, draws, upcoming: upcoming.length, totalPoints, totalConceded, winRate, homeWins, awayWins, homeMatches, awayMatches };
  }, [results, upcoming]);

  const selectedClubName = useMemo(() => {
    if (selectedClubId === "all") return null;
    const club = userClubs.find((c: any) => String(c.id) === selectedClubId);
    return club?.name || null;
  }, [selectedClubId, userClubs]);

  const FiltersBar = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {["ALL", "MENS", "LADIES", "MIXED"].map(cat => (
          <CategoryPill
            key={cat}
            category={cat}
            active={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          />
        ))}
      </div>
      {divisions.length > 1 && (
        <Select value={selectedDivision} onValueChange={setSelectedDivision}>
          <SelectTrigger className="w-48 h-8 text-xs" data-testid="select-division-filter">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <div className="space-y-0 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="relative h-[280px] sm:h-[340px] overflow-hidden" data-testid="league-hero">
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
          <TabsList className="grid w-full grid-cols-4 h-11 bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/40" data-testid="league-tabs">
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
              value="dashboard"
              className="text-xs sm:text-sm font-bold uppercase tracking-wide data-[state=active]:bg-[#1a3a5c] data-[state=active]:text-white"
              data-testid="tab-dashboard"
            >
              Dashboard
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

            <FiltersBar />

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
                        <MatchFixtureRow
                          key={m.id}
                          match={m}
                          expanded={expandedMatchId === m.id}
                          onToggle={() => setExpandedMatchId(expandedMatchId === m.id ? null : m.id)}
                        />
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

            <FiltersBar />

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
                        <MatchResultRow
                          key={m.id}
                          match={m}
                          expanded={expandedMatchId === m.id}
                          onToggle={() => setExpandedMatchId(expandedMatchId === m.id ? null : m.id)}
                        />
                      ))}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="dashboard" className="mt-5 space-y-5">
            <h2 className="text-lg font-extrabold uppercase tracking-tight" data-testid="text-dashboard-header">Club Dashboard</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{stats.wins}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Wins</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{stats.losses}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Losses</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">{stats.draws}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Draws</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{stats.upcoming}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Upcoming</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <div className="bg-[#1a3a5c] px-5 py-3">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Season Overview
                </h3>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Win Rate</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-extrabold">{stats.winRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.winRate}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Point Diff</p>
                    <div className="flex items-end gap-2">
                      <span className={`text-3xl font-extrabold ${stats.totalPoints - stats.totalConceded >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {stats.totalPoints - stats.totalConceded > 0 ? "+" : ""}{stats.totalPoints - stats.totalConceded}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {stats.totalPoints} scored / {stats.totalConceded} conceded
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <div className="bg-[#1a3a5c] px-5 py-3">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Target className="h-4 w-4" /> Home vs Away
                </h3>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Home Record</p>
                    <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                      {stats.homeWins}/{stats.homeMatches}
                    </p>
                    <p className="text-[10px] text-muted-foreground">wins from {stats.homeMatches} home games</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Away Record</p>
                    <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                      {stats.awayWins}/{stats.awayMatches}
                    </p>
                    <p className="text-[10px] text-muted-foreground">wins from {stats.awayMatches} away games</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {results.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h4 className="font-bold text-xs mb-4 uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Recent Form
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {results.slice(0, 10).reverse().map((m: any, idx: number) => {
                      const o = m.result?.outcome;
                      const bg = o === "WIN" ? "bg-green-500" : o === "LOSS" ? "bg-red-500" : "bg-yellow-500";
                      const letter = o === "WIN" ? "W" : o === "LOSS" ? "L" : "D";
                      return (
                        <div key={idx} className="flex flex-col items-center gap-0.5">
                          <div className={`${bg} w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold`} data-testid={`form-indicator-${idx}`}>
                            {letter}
                          </div>
                          <span className="text-[8px] text-muted-foreground">{m.opponentClub?.slice(0, 6)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <h3 className="text-sm font-extrabold uppercase tracking-tight mt-2">By Division</h3>
            <DivisionBreakdown results={results.length > 0 ? results : allResults} />
          </TabsContent>

          <TabsContent value="stats" className="mt-5 space-y-4">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Season Stats</h2>

            <FiltersBar />

            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <StatRow label="Games Played" value={stats.total} />
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
