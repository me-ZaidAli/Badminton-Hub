import { useState } from "react";
import { Link } from "wouter";
import { useTournamentsLeaderboard } from "@/hooks/use-tournaments";
import { useClubs } from "@/hooks/use-clubs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import { Trophy, Loader2, ChevronLeft, Search, Crown, Medal, Award } from "lucide-react";

export default function TournamentsLeaderboard() {
  const { data: rows, isLoading } = useTournamentsLeaderboard();
  const { data: clubs } = useClubs();
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [openProfileId, setOpenProfileId] = useState<number | null>(null);

  const filtered = (rows || [])
    .filter(r => !search || r.fullName.toLowerCase().includes(search.toLowerCase()))
    .filter(r => clubFilter === "all" || r.clubId === Number(clubFilter))
    .filter(r => genderFilter === "all" || r.gender === genderFilter);

  const clubName = (id: number | null) => clubs?.find(c => c.id === id)?.name || "—";

  function rankAccent(rank: number) {
    if (rank === 1) return { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
    if (rank === 2) return { icon: Medal, color: "text-slate-300", bg: "bg-slate-500/15 border-slate-400/30" };
    if (rank === 3) return { icon: Award, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" };
    return null;
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/tournaments">
          <Button variant="ghost" size="sm" data-testid="link-back-tournaments">
            <ChevronLeft className="h-4 w-4 mr-1" /> Tournaments
          </Button>
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/60 via-purple-900/40 to-amber-900/40 border border-violet-500/20 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight" data-testid="text-page-title">
              All-Time Tournament Leaderboard
            </h1>
            <p className="text-sm text-gray-300">Ranked across every tournament match played in the system.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player..."
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={clubFilter} onValueChange={setClubFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-club"><SelectValue placeholder="All clubs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clubs</SelectItem>
            {clubs?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-gender"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All players</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground" data-testid="text-empty">No tournament results yet.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">#</th>
                  <th className="px-3 py-2.5 text-left">Player</th>
                  <th className="px-3 py-2.5 text-left hidden md:table-cell">Club</th>
                  <th className="px-3 py-2.5 text-center">Tnms</th>
                  <th className="px-3 py-2.5 text-center">P</th>
                  <th className="px-3 py-2.5 text-center text-green-500">W</th>
                  <th className="px-3 py-2.5 text-center text-red-500">L</th>
                  <th className="px-3 py-2.5 text-center hidden sm:table-cell">+/-</th>
                  <th className="px-3 py-2.5 text-center">Win %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const rank = i + 1;
                  const accent = rankAccent(rank);
                  return (
                    <tr
                      key={row.userId}
                      className="border-t border-border/40 hover:bg-muted/30 transition cursor-pointer"
                      onClick={() => row.profileId && setOpenProfileId(row.profileId)}
                      data-testid={`row-player-${row.userId}`}
                    >
                      <td className="px-3 py-2.5">
                        {accent ? (
                          <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${accent.bg}`}>
                            <accent.icon className={`h-3.5 w-3.5 ${accent.color}`} />
                            <span className="text-xs font-bold">{rank}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">{rank}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium" data-testid={`text-name-${row.userId}`}>{row.fullName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                          {row.grade && <Badge variant="outline" className="text-[10px] py-0">{row.grade}</Badge>}
                          <span className="text-[10px] text-muted-foreground truncate">{clubName(row.clubId)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {row.grade && <Badge variant="outline" className="text-xs">{row.grade}</Badge>}
                          <span className="text-muted-foreground text-xs truncate">{clubName(row.clubId)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono" data-testid={`text-tournaments-${row.userId}`}>{row.tournamentsPlayed}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{row.matchesPlayed}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-green-600">{row.matchesWon}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-red-500">{row.matchesLost}</td>
                      <td className="px-3 py-2.5 text-center font-mono hidden sm:table-cell">
                        <span className={row.pointDifference > 0 ? "text-green-600" : row.pointDifference < 0 ? "text-red-500" : "text-muted-foreground"}>
                          {row.pointDifference > 0 ? "+" : ""}{row.pointDifference}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold ${row.winRate >= 50 ? "text-green-600" : "text-muted-foreground"}`}>{row.winRate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PlayerStatsDialog
        profileId={openProfileId}
        open={openProfileId !== null}
        onOpenChange={(o) => !o && setOpenProfileId(null)}
      />
    </div>
  );
}
