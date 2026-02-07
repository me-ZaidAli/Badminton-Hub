import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Trophy, Users, Search, Loader2, Target, TrendingUp, Filter } from "lucide-react";

interface AdminRankingPlayer {
  profileId: number;
  userId: number;
  clubId: number;
  clubName: string;
  fullName: string;
  email: string;
  gender: string;
  category: string;
  matchesPlayed: number;
  matchesWon: number;
  playerStatus: string;
  clubRole: string;
}

export default function AdminRankings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  const { data: rankings, isLoading } = useQuery<AdminRankingPlayer[]>({
    queryKey: ["/api/admin/rankings"],
  });

  const uniqueClubs = rankings
    ? Array.from(new Set(rankings.map((p) => p.clubName))).sort()
    : [];

  const filtered = (rankings || [])
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      if (q && !p.fullName.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false;
      if (clubFilter !== "all" && p.clubName !== clubFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      return true;
    })
    .sort((a, b) => b.matchesWon - a.matchesWon || (b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0) - (a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0));

  const totalPlayers = filtered.length;
  const totalMatches = totalPlayers > 0
    ? filtered.reduce((sum, p) => sum + p.matchesPlayed, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Platform Rankings"
          description="View player rankings across all clubs"
        />
        <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Rankings"
        description="View player rankings across all clubs"
      />

      <div className="flex flex-wrap items-center gap-3" data-testid="filter-controls">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={clubFilter} onValueChange={setClubFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-club-filter">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {uniqueClubs.map((club) => (
              <SelectItem key={club} value={club}>{club}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-category-filter">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="D">D</SelectItem>
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-gender-filter">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="MALE">MALE</SelectItem>
            <SelectItem value="FEMALE">FEMALE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-players">{totalPlayers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-matches">{totalMatches}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px] text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Club</TableHead>
                <TableHead className="text-center">Gender</TableHead>
                <TableHead className="text-center">Category</TableHead>
                <TableHead className="text-right">Matches</TableHead>
                <TableHead className="text-right">W / L</TableHead>
                <TableHead className="text-right pr-6">Win %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No players found matching your filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((player, index) => {
                  const winRate = player.matchesPlayed > 0
                    ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
                    : 0;

                  return (
                    <TableRow key={`${player.profileId}-${player.clubId}`} data-testid={`ranking-row-${player.profileId}`}>
                      <TableCell className="text-center font-bold text-lg text-muted-foreground" data-testid={`text-rank-${player.profileId}`}>
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                            <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold" data-testid={`text-player-name-${player.profileId}`}>{player.fullName}</div>
                            <div className="text-xs text-muted-foreground">{player.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-club-${player.profileId}`}>{player.clubName}</TableCell>
                      <TableCell className="text-center" data-testid={`text-gender-${player.profileId}`}>{player.gender}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono" data-testid={`badge-category-${player.profileId}`}>{player.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-matches-${player.profileId}`}>
                        {player.matchesPlayed}
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-wl-${player.profileId}`}>
                        <span className="text-green-600">{player.matchesWon}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-500">{player.matchesPlayed - player.matchesWon}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg pr-6" data-testid={`text-winrate-${player.profileId}`}>
                        <span className={winRate > 50 ? "text-green-600" : "text-muted-foreground"}>{winRate}%</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
