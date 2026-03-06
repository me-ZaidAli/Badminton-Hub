import { useState, useMemo } from "react";
import { useClubs, useFilteredLeaderboard, type LeaderboardFilters, type LeaderboardPlayer } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trophy, Search, Star, Flame, Target, Zap, Award, Medal, Loader2, RotateCcw, TrendingUp, Percent, Swords, Info, ArrowUpDown,
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
        holders.push({ id, icon: Shield, label: ironman.gender === "FEMALE" ? "Iron Woman" : "Iron Man", description: "Most matches played", color: "text-blue-500", bgColor: "bg-blue-500/15", holderName: ironman.displayName || ironman.fullName || "Unknown" });
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

function PodiumCard({
  player,
  place,
  computePoints,
  isMe,
  onClick,
}: {
  player: any;
  place: 1 | 2 | 3;
  computePoints: (p: LeaderboardPlayer) => number;
  isMe: boolean;
  onClick: () => void;
}) {
  const crownColors = {
    1: { main: "#FFD700", glow: "rgba(255,215,0,0.4)", gradient: "from-amber-400 to-yellow-500" },
    2: { main: "#C0C0C0", glow: "rgba(192,192,192,0.3)", gradient: "from-slate-300 to-gray-400" },
    3: { main: "#CD7F32", glow: "rgba(205,127,50,0.3)", gradient: "from-amber-600 to-orange-700" },
  }[place];

  const pedestalHeight = place === 1 ? "h-28" : place === 2 ? "h-20" : "h-16";
  const pedestalOrder = place === 1 ? "order-2" : place === 2 ? "order-1" : "order-3";
  const avatarSize = place === 1 ? "h-16 w-16" : "h-12 w-12";
  const crownSize = place === 1 ? "h-10 w-10" : "h-7 w-7";
  const nameSize = place === 1 ? "text-sm" : "text-xs";

  return (
    <div
      className={`flex flex-col items-center ${pedestalOrder} cursor-pointer group`}
      onClick={onClick}
      data-testid={`podium-${place}`}
    >
      <div className="relative mb-1">
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 z-20"
          style={{ filter: `drop-shadow(0 2px 6px ${crownColors.glow})` }}
        >
          <Crown className={crownSize} style={{ color: crownColors.main }} fill={crownColors.main} />
        </div>
        <div className="relative">
          <div
            className="absolute -inset-1 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${crownColors.main}40, transparent 60%)`,
              filter: `blur(3px)`,
            }}
          />
          <Avatar className={`${avatarSize} border-2 relative z-10`} style={{ borderColor: crownColors.main }}>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
            <AvatarFallback className="bg-[#1a2744] text-white text-xs">
              {player.fullName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <p className={`${nameSize} font-bold text-white mt-1 text-center truncate max-w-[100px]`}>
        {player.displayName || player.fullName}
        {isMe && <span className="text-cyan-400 ml-1 text-[10px]">(You)</span>}
      </p>

      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[10px] font-bold text-emerald-400">{player.winPercentage}%</span>
        <span className="text-[10px] text-slate-500">·</span>
        <span className="text-[10px] text-slate-400">{player.matchesPlayed} played</span>
        <span className="text-[10px] text-slate-500">·</span>
        <span className="text-[10px] text-slate-400">{computePoints(player)} pts</span>
      </div>

      <div
        className={`${pedestalHeight} w-24 sm:w-28 mt-2 rounded-t-xl flex items-center justify-center relative overflow-hidden group-hover:brightness-110 transition-all`}
        style={{
          background: `linear-gradient(180deg, ${crownColors.main}15 0%, #0c1322 40%, #0a0f1e 100%)`,
          border: `1px solid ${crownColors.main}30`,
          borderBottom: "none",
        }}
      >
        <span
          className="text-4xl font-black"
          style={{
            color: `${crownColors.main}15`,
            textShadow: `0 0 20px ${crownColors.main}08`,
          }}
        >
          {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
        </span>
      </div>
    </div>
  );
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

  const top3 = rankedLeaderboard.slice(0, 3);
  const remaining = rankedLeaderboard.slice(3);

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

      {myStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Your Rank</p>
                <p className="text-xl font-black text-white" data-testid="text-my-rank">
                  {myRank ? `#${myRank}` : "-"}
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Wins / Losses</p>
                <p className="text-xl font-black" data-testid="text-my-wins">
                  <span className="text-emerald-400">{myStats.matchesWon}</span>
                  <span className="text-slate-600"> / </span>
                  <span className="text-red-400">{myStats.matchesLost}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-500/15 flex items-center justify-center">
                <Percent className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Win Rate</p>
                <p className="text-xl font-black text-white" data-testid="text-my-winrate">
                  {myStats.winPercentage}%
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center">
                <Swords className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Matches Played</p>
                <p className="text-xl font-black text-white" data-testid="text-my-matches">
                  {myStats.matchesPlayed}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant={clubScope === "my" ? "default" : "outline"}
              size="sm"
              onClick={() => { setClubScope("my"); setSelectedClubId("all"); }}
              className={clubScope === "my" ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/30" : "border-[#1e293b] text-slate-400 hover:bg-[#1e293b]/50"}
              data-testid="button-scope-my-clubs"
            >
              My Clubs
            </Button>
            <Button
              variant={clubScope === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => { setClubScope("all"); setSelectedClubId("all"); }}
              className={clubScope === "all" ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/30" : "border-[#1e293b] text-slate-400 hover:bg-[#1e293b]/50"}
              data-testid="button-scope-all-clubs"
            >
              All Clubs
            </Button>
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search players or clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0a0f1e] border-[#1e293b] text-slate-300 placeholder:text-slate-600"
              data-testid="input-search-rankings"
            />
          </div>
          {displayClubs.length > 0 && (
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[180px] bg-[#0a0f1e] border-[#1e293b] text-slate-300" data-testid="select-club-filter-rankings">
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
            <SelectTrigger className="w-[130px] bg-[#0a0f1e] border-[#1e293b] text-slate-300" data-testid="select-category-filter-rankings">
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
            <SelectTrigger className="w-[130px] bg-[#0a0f1e] border-[#1e293b] text-slate-300" data-testid="select-gender-filter-rankings">
              <SelectValue placeholder="All Players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select value={matchType} onValueChange={setMatchType}>
            <SelectTrigger className="w-[130px] bg-[#0a0f1e] border-[#1e293b] text-slate-300" data-testid="select-match-type-rankings">
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
            <SelectTrigger className="w-[150px] bg-[#0a0f1e] border-[#1e293b] text-slate-300" data-testid="select-time-rankings">
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
            <SelectTrigger className="w-[170px] bg-[#0a0f1e] border-[#1e293b] text-slate-300" data-testid="select-sort-by">
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
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-400 hover:text-white" data-testid="button-reset-ranking-filters">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {badgeHolders.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-300">Badge Guide</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {badgeHolders.map((badge) => (
              <div key={badge.label} className="flex items-center gap-3 p-2 rounded-md bg-[#1e293b]/30" data-testid={`badge-holder-${badge.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.bgColor} shrink-0`}>
                  <badge.icon className={`w-4 h-4 ${badge.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">{badge.label}</div>
                  <div className="text-xs text-slate-500 truncate">{badge.holderName}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#1e293b]">
            <div className="text-xs font-medium mb-2 text-slate-500">Achievement Badges</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-400">5+ Wins</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-400">10+ Matches</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-slate-400">Top Performer (75%+ win rate)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs text-slate-400">First Win</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Medal className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-slate-400">Undefeated (3+ matches)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-end justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : rankedLeaderboard.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b] py-16 text-center">
          <Target className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="font-medium text-slate-400">No players found</p>
          <p className="text-sm mt-1 text-slate-500">
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : clubScope === "my" && myClubs.length === 0
                ? "Join a club to see rankings here."
                : "Complete some matches to appear on the leaderboard."}
          </p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b]">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-purple-500/5 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-amber-500/3 pointer-events-none" />
              <div className="relative z-10 pt-12 pb-4 px-4">
                <div className="flex items-end justify-center gap-2 sm:gap-6">
                  {top3.length >= 2 && (
                    <PodiumCard
                      player={top3[1]}
                      place={2}
                      computePoints={computePoints}
                      isMe={myProfile?.id === top3[1].id}
                      onClick={() => { setStatsPlayerId(top3[1].id); setStatsOpen(true); }}
                    />
                  )}
                  {top3.length >= 1 && (
                    <PodiumCard
                      player={top3[0]}
                      place={1}
                      computePoints={computePoints}
                      isMe={myProfile?.id === top3[0].id}
                      onClick={() => { setStatsPlayerId(top3[0].id); setStatsOpen(true); }}
                    />
                  )}
                  {top3.length >= 3 && (
                    <PodiumCard
                      player={top3[2]}
                      place={3}
                      computePoints={computePoints}
                      isMe={myProfile?.id === top3[2].id}
                      onClick={() => { setStatsPlayerId(top3[2].id); setStatsOpen(true); }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {remaining.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
              <div className="relative z-10 overflow-x-auto">
                <table className="w-full text-left" data-testid="rankings-table">
                  <thead>
                    <tr className="border-b border-[#1e293b]">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[60px]">Rank</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Player</th>
                      {selectedClubId === "all" && (
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Club</th>
                      )}
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center w-[70px]">Grade</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center w-[70px]">Played</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center w-[80px]">Win %</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center w-[90px]">W / L</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center w-[70px]">Points</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden lg:table-cell w-[120px]">Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remaining.map((player) => {
                      const achievements = getAchievements(player);
                      const isMe = myProfile?.id === player.id;
                      const isNewEntry = player.matchesPlayed <= 3;
                      const uniqueBadge = uniqueBadgesMap.get(player.id);

                      return (
                        <tr
                          key={player.id}
                          className={`border-b border-[#1e293b]/50 cursor-pointer transition-colors ${isMe ? "bg-cyan-500/5 border-l-2 border-l-cyan-500" : "hover:bg-[#1e293b]/30"}`}
                          onClick={() => { setStatsPlayerId(player.id); setStatsOpen(true); }}
                          data-testid={`ranking-row-${player.id}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <span className={`text-base font-bold ${player.isTied ? "text-slate-500" : "text-slate-300"}`}>
                              {player.isTied ? `=${player.rank}` : player.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {uniqueBadge && (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${uniqueBadge.bgColor}`} title={uniqueBadge.label} data-testid={`badge-unique-${player.id}`}>
                                  <uniqueBadge.icon className={`w-4 h-4 ${uniqueBadge.color}`} />
                                </div>
                              )}
                              <Avatar className="h-8 w-8 border border-[#1e293b]">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                                <AvatarFallback className="bg-[#1a2744] text-slate-300 text-xs">
                                  {player.fullName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-slate-200 truncate flex items-center gap-1.5">
                                  {player.displayName || player.fullName}
                                  {isMe && <span className="text-[10px] text-cyan-400 font-bold px-1 py-0 bg-cyan-500/10 rounded">You</span>}
                                  {isNewEntry && (
                                    <span className="text-[10px] text-emerald-400 font-bold px-1 py-0 bg-emerald-500/10 rounded">New</span>
                                  )}
                                </div>
                                {player.gender && (
                                  <span className="text-[10px] text-slate-500">
                                    {player.gender === "MALE" ? "Male" : "Female"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {selectedClubId === "all" && (
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-slate-500 truncate">{player.clubName}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-mono font-bold text-slate-300 bg-[#1e293b]/50 px-2 py-0.5 rounded">
                              {(player as any).grade || player.category || "?"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-slate-300">{player.matchesPlayed}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-bold ${player.winPercentage >= 50 ? "text-emerald-400" : "text-slate-400"}`}>
                              {player.winPercentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium">
                              <span className="text-emerald-400">{player.matchesWon}</span>
                              <span className="text-slate-600"> / </span>
                              <span className="text-red-400">{player.matchesLost}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-white" data-testid={`text-points-${player.id}`}>
                              {player.totalPoints}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              {achievements.slice(0, 3).map((a, i) => (
                                <div key={i} title={a.label}>
                                  <a.icon className={`w-3.5 h-3.5 ${a.color}`} />
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {rankedLeaderboard.length > 0 && (
        <div className="text-sm text-slate-500 text-center">
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
