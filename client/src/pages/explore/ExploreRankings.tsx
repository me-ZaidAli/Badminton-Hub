import { useState, useMemo } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClubs, useFilteredLeaderboard, type LeaderboardFilters, type LeaderboardPlayer } from "@/hooks/use-clubs";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import {
  Trophy, Loader2, Search, RotateCcw, Target,
  Flame, Star, Award, Zap, Medal
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getQuarterDates(year: number, quarter: number): { dateFrom: string; dateTo: string } {
  const startMonth = (quarter - 1) * 3;
  const dateFrom = new Date(year, startMonth, 1).toISOString();
  const dateTo = new Date(year, startMonth + 3, 0, 23, 59, 59).toISOString();
  return { dateFrom, dateTo };
}

function getCurrentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getTimePeriodDates(period: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (period === "all") return {};
  if (period === "last30") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { dateFrom: d.toISOString() };
  }
  if (period === "thisMonth") {
    return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  if (period === "thisSeason") {
    const q = getCurrentQuarter();
    return getQuarterDates(now.getFullYear(), q);
  }
  if (period.startsWith("Q")) {
    const parts = period.split("-");
    const q = parseInt(parts[0].replace("Q", ""));
    const y = parseInt(parts[1]);
    return getQuarterDates(y, q);
  }
  return {};
}

function getAchievements(player: LeaderboardPlayer): { icon: any; label: string; color: string }[] {
  const badges: { icon: any; label: string; color: string }[] = [];
  if (player.matchesWon >= 5) {
    badges.push({ icon: Flame, label: "5+ Wins", color: "text-orange-500" });
  }
  if (player.matchesPlayed >= 10) {
    badges.push({ icon: Star, label: "10+ Matches", color: "text-amber-500" });
  }
  if (player.winPercentage >= 75 && player.matchesPlayed >= 4) {
    badges.push({ icon: Award, label: "Top Performer", color: "text-purple-500" });
  }
  if (player.matchesWon >= 1 && player.matchesPlayed <= 3) {
    badges.push({ icon: Zap, label: "First Win", color: "text-green-500" });
  }
  if (player.winPercentage === 100 && player.matchesPlayed >= 3) {
    badges.push({ icon: Medal, label: "Undefeated", color: "text-yellow-500" });
  }
  return badges;
}

function getSeasonOptions() {
  const currentYear = getCurrentYear();
  const currentQ = getCurrentQuarter();
  const options: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= currentYear - 1; y--) {
    const maxQ = y === currentYear ? currentQ : 4;
    for (let q = maxQ; q >= 1; q--) {
      options.push({
        value: `Q${q}-${y}`,
        label: `Q${q} ${y} (${["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"][q - 1]})`,
      });
    }
  }
  return options;
}

export default function ExploreRankings() {
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [matchType, setMatchType] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const timeDates = useMemo(() => getTimePeriodDates(timePeriod), [timePeriod]);
  const seasonOptions = useMemo(() => getSeasonOptions(), []);

  const filters: LeaderboardFilters = useMemo(() => {
    const f: LeaderboardFilters = {};
    if (selectedClubId !== "all") f.clubId = Number(selectedClubId);
    if (category !== "all") f.category = category;
    if (gender !== "all") f.gender = gender;
    if (matchType !== "all") f.matchType = matchType;
    if (timeDates.dateFrom) f.dateFrom = timeDates.dateFrom;
    if (timeDates.dateTo) f.dateTo = timeDates.dateTo;
    return f;
  }, [selectedClubId, category, gender, matchType, timeDates]);

  const { data: leaderboard, isLoading } = useFilteredLeaderboard(filters);

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    if (!searchQuery.trim()) return leaderboard;
    const q = searchQuery.toLowerCase();
    return leaderboard.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      (p.clubName && p.clubName.toLowerCase().includes(q))
    );
  }, [leaderboard, searchQuery]);

  const rankedLeaderboard = useMemo(() => {
    let currentRank = 0;
    let lastWins = -1;
    let lastPct = -1;
    return filteredLeaderboard.map((player, index) => {
      const isTied = player.matchesWon === lastWins && player.winPercentage === lastPct;
      if (!isTied) currentRank = index + 1;
      lastWins = player.matchesWon;
      lastPct = player.winPercentage;
      return { ...player, rank: currentRank, isTied };
    });
  }, [filteredLeaderboard]);

  const hasActiveFilters = selectedClubId !== "all" || category !== "all" || gender !== "all" || matchType !== "all" || timePeriod !== "all" || searchQuery.trim();

  const resetFilters = () => {
    setSelectedClubId("all");
    setCategory("all");
    setGender("all");
    setMatchType("all");
    setTimePeriod("all");
    setSearchQuery("");
  };

  return (
    <PublicLayout>
      <section className="py-12" data-testid="section-explore-rankings">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              <Trophy className="inline-block w-8 h-8 text-amber-500 mr-2 -mt-1" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Player rankings calculated from match results. Filter by club, grade, gender, and time period.
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players or clubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-explore-leaderboard"
                  />
                </div>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger className="w-[180px]" data-testid="select-explore-club-filter">
                    <SelectValue placeholder="All Clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {clubs?.map(club => (
                      <SelectItem key={club.id} value={club.id.toString()}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[130px]" data-testid="select-explore-category-filter">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-[130px]" data-testid="select-explore-gender-filter">
                    <SelectValue placeholder="All Players" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="JUNIOR">Junior</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={matchType} onValueChange={setMatchType}>
                  <SelectTrigger className="w-[130px]" data-testid="select-explore-match-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="SINGLES">Singles</SelectItem>
                    <SelectItem value="DOUBLES">Doubles</SelectItem>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger className="w-[170px]" data-testid="select-explore-time-period-filter">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="thisSeason">This Season</SelectItem>
                    {seasonOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-explore-reset-filters">
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[70px] text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  {selectedClubId === "all" && (
                    <TableHead className="hidden md:table-cell">Club</TableHead>
                  )}
                  <TableHead className="text-center w-[80px]">Grade</TableHead>
                  <TableHead className="text-right w-[80px]">Played</TableHead>
                  <TableHead className="text-right w-[100px]">W / L</TableHead>
                  <TableHead className="text-right w-[80px]">Win %</TableHead>
                  <TableHead className="hidden lg:table-cell w-[140px]">Achievements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell className="h-14"><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                      <TableCell><div className="w-32 h-4 bg-muted animate-pulse rounded" /></TableCell>
                      {selectedClubId === "all" && <TableCell className="hidden md:table-cell" />}
                      <TableCell colSpan={5} />
                    </TableRow>
                  ))
                ) : rankedLeaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedClubId === "all" ? 8 : 7} className="text-center py-12 text-muted-foreground">
                      <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No players found</p>
                      <p className="text-sm mt-1">
                        {hasActiveFilters
                          ? "Try adjusting your filters to see more results."
                          : "Complete some matches to appear on the leaderboard."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : rankedLeaderboard.map((player) => {
                  const achievements = getAchievements(player);
                  const isNewEntry = player.matchesPlayed <= 3;

                  return (
                    <TableRow
                      key={player.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => { setStatsPlayerId(player.id); setStatsOpen(true); }}
                      data-testid={`explore-leaderboard-row-${player.id}`}
                    >
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {player.rank <= 3 ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              player.rank === 1 ? "bg-amber-500 text-white" :
                              player.rank === 2 ? "bg-gray-400 text-white" :
                              "bg-amber-700 text-white"
                            }`}>
                              {player.rank}
                            </div>
                          ) : (
                            <span className={`text-lg font-bold ${player.isTied ? "text-muted-foreground" : "text-foreground"}`}>
                              {player.isTied ? `=${player.rank}` : player.rank}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                            <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold truncate flex items-center gap-1.5">
                              {player.fullName}
                              {isNewEntry && (
                                <Badge variant="secondary" className="text-[10px] py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                  New
                                </Badge>
                              )}
                            </div>
                            {player.gender && (
                              <span className="text-xs text-muted-foreground">
                                {player.gender === "MALE" ? "M" : "F"}
                                {player.isJunior && " / Junior"}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {selectedClubId === "all" && (
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground truncate">{player.clubName}</span>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{player.category || "?"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {player.matchesPlayed}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className="text-green-600">{player.matchesWon}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-500">{player.matchesLost}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold text-lg ${player.winPercentage >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
                          {player.winPercentage}%
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          {achievements.slice(0, 3).map((a, i) => (
                            <div key={i} title={a.label}>
                              <a.icon className={`w-4 h-4 ${a.color}`} />
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {rankedLeaderboard.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground px-1 mt-4">
              <span>{rankedLeaderboard.length} player{rankedLeaderboard.length !== 1 ? "s" : ""} ranked</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900/40" />
                  <span>New Entry (3 or fewer matches)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono">=</span>
                  <span>Tied rank</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <PlayerStatsDialog
        playerId={statsPlayerId}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </PublicLayout>
  );
}
