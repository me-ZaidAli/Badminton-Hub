import { useState, useMemo } from "react";
import { useClubs, useFilteredLeaderboard, type LeaderboardFilters, type LeaderboardPlayer } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trophy, Search, ArrowUp, ArrowDown,
  Star, Flame, Target, Zap, Award, Medal, Loader2, RotateCcw, TrendingUp, Percent, Swords, Info, ArrowUpDown,
  Crown, Shield, Sparkles
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";

type Membership = {
  clubId: number;
  clubName: string;
  membershipStatus: string;
  profileId: number;
};

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
    const q = Math.floor(now.getMonth() / 3) + 1;
    const startMonth = (q - 1) * 3;
    return {
      dateFrom: new Date(now.getFullYear(), startMonth, 1).toISOString(),
      dateTo: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59).toISOString(),
    };
  }
  return {};
}

function getAchievements(player: LeaderboardPlayer): { icon: any; label: string; color: string }[] {
  const badges: { icon: any; label: string; color: string }[] = [];
  if (player.matchesWon >= 5) badges.push({ icon: Flame, label: "5+ Wins", color: "text-orange-500" });
  if (player.matchesPlayed >= 10) badges.push({ icon: Star, label: "10+ Matches", color: "text-amber-500" });
  if (player.winPercentage >= 75 && player.matchesPlayed >= 4) badges.push({ icon: Award, label: "Top Performer", color: "text-purple-500" });
  if (player.matchesWon >= 1 && player.matchesPlayed <= 3) badges.push({ icon: Zap, label: "First Win", color: "text-green-500" });
  if (player.winPercentage === 100 && player.matchesPlayed >= 3) badges.push({ icon: Medal, label: "Undefeated", color: "text-yellow-500" });
  return badges;
}

interface BadgeHolder {
  id: number;
  icon: any;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  holderName: string;
}

function getBadgeHolders(players: any[]): BadgeHolder[] {
  const holders: BadgeHolder[] = [];
  const usedIds = new Set<number>();
  if (players.length === 0) return holders;

  const maxWins = Math.max(...players.map(p => p.matchesWon));
  if (maxWins > 0) {
    const champion = players.find(p => p.matchesWon === maxWins);
    if (champion) {
      const id = champion.id || champion.profileId;
      usedIds.add(id);
      holders.push({ id, icon: Crown, label: "Champion", description: "Most wins overall", color: "text-amber-500", bgColor: "bg-amber-500/15", holderName: champion.displayName || champion.fullName || "Unknown" });
    }
  }

  const eligible = players.filter(p => p.matchesPlayed >= 5);
  if (eligible.length > 0) {
    const maxPct = Math.max(...eligible.map(p => p.winPercentage));
    if (maxPct > 0) {
      const sharpshooter = eligible.find(p => p.winPercentage === maxPct);
      if (sharpshooter) {
        const id = sharpshooter.id || sharpshooter.profileId;
        if (!usedIds.has(id)) {
          usedIds.add(id);
          holders.push({ id, icon: Target, label: "Sharpshooter", description: "Highest win rate (min 5 matches)", color: "text-red-500", bgColor: "bg-red-500/15", holderName: sharpshooter.displayName || sharpshooter.fullName || "Unknown" });
        }
      }
    }
  }

  const maxMatches = Math.max(...players.map(p => p.matchesPlayed));
  if (maxMatches > 0) {
    const ironman = players.find(p => p.matchesPlayed === maxMatches);
    if (ironman) {
      const id = ironman.id || ironman.profileId;
      if (!usedIds.has(id)) {
        usedIds.add(id);
        holders.push({ id, icon: Shield, label: "Ironman", description: "Most matches played", color: "text-blue-500", bgColor: "bg-blue-500/15", holderName: ironman.displayName || ironman.fullName || "Unknown" });
      }
    }
  }

  const newcomers = players.filter(p => p.matchesPlayed >= 3 && p.matchesPlayed <= 10);
  if (newcomers.length > 0) {
    const maxNewPct = Math.max(...newcomers.map(p => p.winPercentage));
    if (maxNewPct > 0) {
      const star = newcomers.find(p => p.winPercentage === maxNewPct);
      if (star) {
        const id = star.id || star.profileId;
        if (!usedIds.has(id)) {
          usedIds.add(id);
          holders.push({ id, icon: Sparkles, label: "Rising Star", description: "Best newcomer (3-10 matches)", color: "text-pink-500", bgColor: "bg-pink-500/15", holderName: star.displayName || star.fullName || "Unknown" });
        }
      }
    }
  }

  return holders;
}

function getUniqueBadges(players: any[]): Map<number, { icon: any; label: string; color: string; bgColor: string }> {
  const holders = getBadgeHolders(players);
  const badges = new Map<number, { icon: any; label: string; color: string; bgColor: string }>();
  holders.forEach(h => badges.set(h.id, { icon: h.icon, label: h.label, color: h.color, bgColor: h.bgColor }));
  return badges;
}

export default function PlayerRankings() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const [clubScope, setClubScope] = useState<"my" | "all">("my");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [matchType, setMatchType] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("default");
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const { data: memberships } = useQuery<Membership[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const myClubIds = useMemo(() => {
    if (!memberships) return new Set<number>();
    return new Set(memberships.filter(m => m.membershipStatus === "APPROVED").map(m => m.clubId));
  }, [memberships]);

  const myClubs = useMemo(() => {
    if (!clubs) return [];
    return clubs.filter(c => myClubIds.has(c.id));
  }, [clubs, myClubIds]);

  const displayClubs = clubScope === "my" ? myClubs : (clubs || []);

  const timeDates = useMemo(() => getTimePeriodDates(timePeriod), [timePeriod]);

  const filters: LeaderboardFilters = useMemo(() => {
    const f: LeaderboardFilters = {};
    if (selectedClubId !== "all") {
      f.clubId = Number(selectedClubId);
    }
    if (category !== "all") f.category = category;
    if (gender !== "all") f.gender = gender;
    if (matchType !== "all") f.matchType = matchType;
    if (timeDates.dateFrom) f.dateFrom = timeDates.dateFrom;
    if (timeDates.dateTo) f.dateTo = timeDates.dateTo;
    return f;
  }, [selectedClubId, category, gender, matchType, timeDates]);

  const { data: leaderboard, isLoading } = useFilteredLeaderboard(filters);

  const gradeRank = (grade: string | null | undefined): number => {
    const order = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
    const idx = order.indexOf(grade || "");
    return idx >= 0 ? idx : -1;
  };

  const computePoints = (player: LeaderboardPlayer): number => {
    return (player.matchesWon * 3) + (player.matchesLost * 1);
  };

  const scopedLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    if (clubScope === "my" && selectedClubId === "all") {
      return leaderboard.filter(p => p.clubId && myClubIds.has(p.clubId));
    }
    return leaderboard;
  }, [leaderboard, clubScope, selectedClubId, myClubIds]);

  const filteredLeaderboard = useMemo(() => {
    let result = [...scopedLeaderboard];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.fullName.toLowerCase().includes(q) ||
        (p.clubName && p.clubName.toLowerCase().includes(q))
      );
    }

    if (sortBy === "grade") {
      result.sort((a, b) => gradeRank(b.grade || b.category) - gradeRank(a.grade || a.category));
    } else if (sortBy === "winpct") {
      result.sort((a, b) => b.winPercentage - a.winPercentage || b.matchesWon - a.matchesWon);
    } else if (sortBy === "matches") {
      result.sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.matchesWon - a.matchesWon);
    } else if (sortBy === "points") {
      result.sort((a, b) => computePoints(b) - computePoints(a) || b.matchesWon - a.matchesWon);
    } else {
      result.sort((a, b) => b.matchesWon - a.matchesWon || b.winPercentage - a.winPercentage || b.matchesPlayed - a.matchesPlayed);
    }

    return result;
  }, [scopedLeaderboard, searchQuery, sortBy]);

  const rankedLeaderboard = useMemo(() => {
    let currentRank = 0;
    let lastWins = -1;
    let lastPct = -1;
    return filteredLeaderboard.map((player, index) => {
      const isTied = player.matchesWon === lastWins && player.winPercentage === lastPct;
      if (!isTied) currentRank = index + 1;
      lastWins = player.matchesWon;
      lastPct = player.winPercentage;
      return { ...player, rank: currentRank, isTied, totalPoints: computePoints(player) };
    });
  }, [filteredLeaderboard]);

  const myProfile = user?.playerProfile;
  const myStats = useMemo(() => {
    if (!myProfile || !scopedLeaderboard) return null;
    return scopedLeaderboard.find(p => p.id === myProfile.id) || null;
  }, [myProfile, scopedLeaderboard]);

  const myRank = useMemo(() => {
    if (!myProfile) return null;
    const idx = rankedLeaderboard.findIndex(p => p.id === myProfile.id);
    return idx >= 0 ? rankedLeaderboard[idx].rank : null;
  }, [myProfile, rankedLeaderboard]);

  const uniqueBadgesMap = useMemo(() => getUniqueBadges(rankedLeaderboard), [rankedLeaderboard]);
  const badgeHolders = useMemo(() => getBadgeHolders(rankedLeaderboard), [rankedLeaderboard]);

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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <PageHeader
          title="Rankings"
          description="See how players rank across clubs based on match performance."
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-ranking-info">
              <Info className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm space-y-3" align="start">
            <h4 className="font-semibold text-base">How Rankings Work</h4>
            <div className="space-y-2 text-muted-foreground">
              <p><span className="font-medium text-foreground">Points System:</span> Players earn 3 points for each win and 1 point for each loss. Points reflect overall activity and success.</p>
              <p><span className="font-medium text-foreground">Default Ranking:</span> Players are ranked first by total wins, then by win percentage as a tiebreaker.</p>
              <p><span className="font-medium text-foreground">Grade:</span> Players have a skill grade from C3 (beginner) to A1 (advanced). Grades are assigned by admins or computed automatically based on recent performance.</p>
              <p><span className="font-medium text-foreground">Auto-Grading:</span> When enabled, the system evaluates a rolling window of the last 5 sessions. Players need at least 10 games across 3 sessions to qualify. A win rate above 55% triggers a promotion, while below 40% triggers a demotion.</p>
              <p><span className="font-medium text-foreground">Win %:</span> Percentage of matches won out of total matches played.</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {badgeHolders.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Badge Guide</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {badgeHolders.map((badge) => (
                <div key={badge.label} className="flex items-center gap-3 p-2 rounded-md bg-muted/30" data-testid={`badge-holder-${badge.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.bgColor} shrink-0`}>
                    <badge.icon className={`w-4 h-4 ${badge.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{badge.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{badge.holderName}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-medium mb-2 text-muted-foreground">Achievement Badges</div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">5+ Wins</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">10+ Matches</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Top Performer (75%+ win rate)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">First Win</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Medal className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Undefeated (3+ matches)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {myStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Rank</p>
                <p className="text-xl font-bold" data-testid="text-my-rank">
                  {myRank ? `#${myRank}` : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wins / Losses</p>
                <p className="text-xl font-bold" data-testid="text-my-wins">
                  <span className="text-green-600">{myStats.matchesWon}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-red-500">{myStats.matchesLost}</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold" data-testid="text-my-winrate">
                  {myStats.winPercentage}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Swords className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matches Played</p>
                <p className="text-xl font-bold" data-testid="text-my-matches">
                  {myStats.matchesPlayed}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant={clubScope === "my" ? "default" : "outline"}
                size="sm"
                onClick={() => { setClubScope("my"); setSelectedClubId("all"); }}
                data-testid="button-scope-my-clubs"
              >
                My Clubs
              </Button>
              <Button
                variant={clubScope === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => { setClubScope("all"); setSelectedClubId("all"); }}
                data-testid="button-scope-all-clubs"
              >
                All Clubs
              </Button>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players or clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-rankings"
              />
            </div>
            {displayClubs.length > 0 && (
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="w-[180px]" data-testid="select-club-filter-rankings">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {displayClubs.map(club => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[130px]" data-testid="select-category-filter-rankings">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-[130px]" data-testid="select-gender-filter-rankings">
                <SelectValue placeholder="All Players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={matchType} onValueChange={setMatchType}>
              <SelectTrigger className="w-[130px]" data-testid="select-match-type-rankings">
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
              <SelectTrigger className="w-[150px]" data-testid="select-time-rankings">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisSeason">This Season</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[170px]" data-testid="select-sort-by">
                <ArrowUpDown className="h-4 w-4 mr-1 shrink-0" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Wins)</SelectItem>
                <SelectItem value="grade">Grade (High to Low)</SelectItem>
                <SelectItem value="winpct">Win % (High to Low)</SelectItem>
                <SelectItem value="matches">Matches (Most to Least)</SelectItem>
                <SelectItem value="points">Points (High to Low)</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-ranking-filters">
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
              <TableHead className="text-right w-[80px]">Points</TableHead>
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
                  <TableCell colSpan={6} />
                </TableRow>
              ))
            ) : rankedLeaderboard.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedClubId === "all" ? 9 : 8} className="text-center py-12 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No players found</p>
                  <p className="text-sm mt-1">
                    {hasActiveFilters
                      ? "Try adjusting your filters to see more results."
                      : clubScope === "my" && myClubs.length === 0
                        ? "Join a club to see rankings here."
                        : "Complete some matches to appear on the leaderboard."}
                  </p>
                </TableCell>
              </TableRow>
            ) : rankedLeaderboard.map((player) => {
              const achievements = getAchievements(player);
              const isMe = myProfile?.id === player.id;
              const isNewEntry = player.matchesPlayed <= 3;
              const uniqueBadge = uniqueBadgesMap.get(player.id);

              return (
                <TableRow
                  key={player.id}
                  className={`cursor-pointer transition-colors ${isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"}`}
                  onClick={() => { setStatsPlayerId(player.id); setStatsOpen(true); }}
                  data-testid={`ranking-row-${player.id}`}
                >
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
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
                      {uniqueBadge && (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${uniqueBadge.bgColor}`} title={uniqueBadge.label} data-testid={`badge-unique-${player.id}`}>
                          <uniqueBadge.icon className={`w-6 h-6 ${uniqueBadge.color}`} />
                        </div>
                      )}
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                        <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1.5">
                          {player.fullName}
                          {isMe && <Badge variant="outline" className="text-[10px] py-0">You</Badge>}
                          {isNewEntry && (
                            <Badge variant="secondary" className="text-[10px] py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              New
                            </Badge>
                          )}
                        </div>
                        {player.gender && (
                          <span className="text-xs text-muted-foreground">
                            {player.gender === "MALE" ? "M" : "F"}
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
                    <Badge variant="outline" className="font-mono">{(player as any).grade || player.category || "?"}</Badge>
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
                  <TableCell className="text-right">
                    <span className="font-bold text-base" data-testid={`text-points-${player.id}`}>
                      {player.totalPoints}
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
        <div className="text-sm text-muted-foreground text-center">
          Showing {rankedLeaderboard.length} player{rankedLeaderboard.length !== 1 ? 's' : ''}
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
