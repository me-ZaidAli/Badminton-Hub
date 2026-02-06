import { useRoute } from "wouter";
import { usePublicTournament, useTournamentTeams, useTournamentMatches, useTournamentStandings } from "@/hooks/use-tournaments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, Trophy, Calendar, MapPin, Users, Swords, BarChart3, GitBranch } from "lucide-react";
import { useState } from "react";
import type { TournamentCategory, TournamentMatch } from "@shared/schema";

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ONGOING: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const formatLabels: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  KNOCKOUT: "Knockout",
  GROUP_KNOCKOUT: "Group + Knockout",
};

export default function PublicTournament() {
  const [, params] = useRoute("/public/tournament/:id");
  const tournamentId = Number(params?.id);
  const { data: tournament, isLoading } = usePublicTournament(tournamentId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!tournament) {
    return <div className="text-center py-12 text-muted-foreground">Tournament not found or not published yet.</div>;
  }

  const categories = tournament.categories || [];
  const activeCategory = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId) : categories[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" data-testid="text-tournament-title">{tournament.name}</h1>
          <Badge className={statusColors[tournament.status] || ""} data-testid="badge-tournament-status">{tournament.status}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(tournament.startDate), "d MMM yyyy")} - {format(new Date(tournament.endDate), "d MMM yyyy")}</span>
          {tournament.club && <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{tournament.club.name}</span>}
          {tournament.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tournament.venue.name}</span>}
        </div>
        {tournament.description && <p className="text-sm text-muted-foreground mt-3">{tournament.description}</p>}
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={activeCategory?.id === cat.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategoryId(cat.id)}
              data-testid={`badge-category-${cat.id}`}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      )}

      {activeCategory && <PublicCategoryView category={activeCategory} />}
    </div>
  );
}

function PublicCategoryView({ category }: { category: TournamentCategory }) {
  const { data: teams } = useTournamentTeams(category.id);
  const { data: matches } = useTournamentMatches(category.id);
  const { data: standings } = useTournamentStandings(category.id);
  const [activeTab, setActiveTab] = useState("matches");

  function getTeamName(teamId: number | null) {
    if (!teamId) return "TBD";
    const team = teams?.find(t => t.id === teamId);
    if (!team) return `#${teamId}`;
    const p1 = team.player1?.user?.fullName || `P${team.player1Id}`;
    if (team.player2) {
      const p2 = team.player2?.user?.fullName || `P${team.player2Id}`;
      return `${p1} / ${p2}`;
    }
    return p1;
  }

  const matchStatusColors: Record<string, string> = {
    UPCOMING: "bg-muted text-muted-foreground",
    LIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    FINISHED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{category.name}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{formatLabels[category.format]}</Badge>
          <Badge variant="outline">{category.playersPerSide === 1 ? "Singles" : "Doubles"}</Badge>
          <Badge variant="outline">{category.genderRestriction || "Mixed"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="matches"><Swords className="h-3.5 w-3.5 mr-1" /> Matches</TabsTrigger>
            <TabsTrigger value="teams"><Users className="h-3.5 w-3.5 mr-1" /> Teams ({teams?.length || 0})</TabsTrigger>
            {(category.format === "ROUND_ROBIN" || category.format === "GROUP_KNOCKOUT") && (
              <TabsTrigger value="standings"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Standings</TabsTrigger>
            )}
            {category.format === "KNOCKOUT" && (
              <TabsTrigger value="bracket"><GitBranch className="h-3.5 w-3.5 mr-1" /> Bracket</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="matches">
            <div className="space-y-2 mt-3">
              {(!matches || matches.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Matches have not been scheduled yet.</p>
              ) : (
                matches.map(match => (
                  <div key={match.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge className={matchStatusColors[match.status] || ""}>
                        {match.isBye ? "BYE" : match.status}
                      </Badge>
                      <span className={`text-sm truncate ${match.winnerId === match.teamAId ? "font-bold" : ""}`}>
                        {getTeamName(match.teamAId)}
                      </span>
                      <span className="text-sm text-muted-foreground">vs</span>
                      <span className={`text-sm truncate ${match.winnerId === match.teamBId ? "font-bold" : ""}`}>
                        {getTeamName(match.teamBId)}
                      </span>
                    </div>
                    {match.scores && (match.scores as any[]).length > 0 && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {(match.scores as Array<{ scoreA: number; scoreB: number }>).map(s => `${s.scoreA}-${s.scoreB}`).join(", ")}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <div className="space-y-2 mt-3">
              {teams?.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground font-mono w-6">{team.seedNumber || idx + 1}</span>
                  <span className="text-sm font-medium">{getTeamName(team.id)}</span>
                  {team.groupNumber && <Badge variant="outline" className="text-xs">Group {team.groupNumber}</Badge>}
                </div>
              ))}
            </div>
          </TabsContent>

          {(category.format === "ROUND_ROBIN" || category.format === "GROUP_KNOCKOUT") && (
            <TabsContent value="standings">
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Team</th>
                      <th className="text-center py-2 px-1">P</th>
                      <th className="text-center py-2 px-1">W</th>
                      <th className="text-center py-2 px-1">L</th>
                      <th className="text-center py-2 px-1 font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings?.map((s, idx) => (
                      <tr key={s.id || s.teamId} className="border-b border-border/50">
                        <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium">{getTeamName(s.teamId)}</td>
                        <td className="text-center py-2 px-1">{s.matchesPlayed}</td>
                        <td className="text-center py-2 px-1">{s.matchesWon}</td>
                        <td className="text-center py-2 px-1">{s.matchesLost}</td>
                        <td className="text-center py-2 px-1 font-bold">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          )}

          {category.format === "KNOCKOUT" && (
            <TabsContent value="bracket">
              <div className="mt-3 overflow-x-auto pb-4">
                {(!matches || matches.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Bracket not available yet.</p>
                ) : (
                  <PublicBracket matches={matches} getTeamName={getTeamName} />
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PublicBracket({ matches, getTeamName }: { matches: TournamentMatch[]; getTeamName: (id: number | null) => string }) {
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <div className="flex gap-8 min-w-fit">
      {rounds.map((round, roundIdx) => {
        const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.matchOrder - b.matchOrder);
        const roundLabel = roundMatches.length === 1 ? "Final" : roundMatches.length === 2 ? "Semi-Finals" : `Round ${round}`;
        return (
          <div key={round} className="flex flex-col gap-4 min-w-[200px]">
            <h4 className="text-xs font-semibold text-muted-foreground text-center uppercase">{roundLabel}</h4>
            <div className="flex flex-col justify-around flex-1 gap-4" style={{ paddingTop: `${roundIdx * 24}px` }}>
              {roundMatches.map(match => (
                <div key={match.id} className="border rounded-md overflow-hidden">
                  <div className={`flex items-center justify-between px-3 py-2 text-xs border-b ${match.winnerId === match.teamAId ? "bg-primary/10 font-semibold" : ""}`}>
                    <span className="truncate max-w-[140px]">{getTeamName(match.teamAId)}</span>
                  </div>
                  <div className={`flex items-center justify-between px-3 py-2 text-xs ${match.winnerId === match.teamBId ? "bg-primary/10 font-semibold" : ""}`}>
                    <span className="truncate max-w-[140px]">{getTeamName(match.teamBId)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
