import { useState } from "react";
import { useClubs, useLeaderboard, usePersonalRanking } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, User, Calendar, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";

export default function Rankings() {
  const { data: user } = useUser();
  const { data: clubs, isLoading: clubsLoading } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"club" | "personal">("club");
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  
  // Auto-select first club if none selected
  const clubId = selectedClubId ?? clubs?.[0]?.id ?? null;
  
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(clubId);
  const { data: personalData, isLoading: personalLoading, error: personalError } = usePersonalRanking(
    viewMode === "personal" && clubId ? clubId : null
  );

  const isLoading = clubsLoading || (viewMode === "club" ? leaderboardLoading : personalLoading);

  const chartData = personalData?.matchHistory ?
    [...personalData.matchHistory]
      .reverse()
      .map((match, index) => ({
        match: index + 1,
        result: match.won ? 1 : 0,
        won: match.won,
        date: match.completedAt ? format(new Date(match.completedAt), "MMM d") : `Match ${index + 1}`
      }))
    : [];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Club Rankings" 
        description="Top players ranked by wins and win percentage."
      />

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Select Club:</label>
          <Select 
            value={clubId?.toString() || ""} 
            onValueChange={(v) => setSelectedClubId(Number(v))}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-club">
              <SelectValue placeholder="Select a club..." />
            </SelectTrigger>
            <SelectContent>
              {clubs?.map(club => (
                <SelectItem key={club.id} value={club.id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "club" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("club")}
            data-testid="button-club-ranking"
          >
            <Trophy className="w-4 h-4 mr-1" />
            Club Ranking
          </Button>
          <Button
            variant={viewMode === "personal" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("personal")}
            data-testid="button-personal-ranking"
          >
            <User className="w-4 h-4 mr-1" />
            Personal Ranking
          </Button>
        </div>
      </div>

      {viewMode === "club" ? (
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px] text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Category</TableHead>
                <TableHead className="text-right">Played</TableHead>
                <TableHead className="text-right">W / L</TableHead>
                <TableHead className="text-right pr-8">Win %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 [1, 2, 3, 4, 5].map(i => (
                   <TableRow key={i}>
                     <TableCell className="h-16"><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                     <TableCell><div className="w-32 h-4 bg-muted animate-pulse rounded" /></TableCell>
                     <TableCell colSpan={4} />
                   </TableRow>
                 ))
              ) : leaderboard?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No players found for this club.
                  </TableCell>
                </TableRow>
              ) : leaderboard?.map((player, index) => (
                  <TableRow
                    key={player.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => { setStatsPlayerId(player.id); setStatsOpen(true); }}
                    data-testid={`leaderboard-row-${player.id}`}
                  >
                    <TableCell className="text-center font-bold text-lg text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                          <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{player.fullName}</div>
                          {index < 3 && <div className="text-xs text-amber-500 font-bold flex items-center gap-1"><Trophy className="w-3 h-3" /> Top 3</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">{player.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {player.matchesPlayed}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="text-green-600">{player.matchesWon}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-red-500">{player.matchesLost}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg pr-8">
                      <span className={player.winPercentage > 50 ? "text-green-600" : "text-muted-foreground"}>{player.winPercentage}%</span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-6">
          {!user ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Please log in to view your personal ranking.</p>
              </CardContent>
            </Card>
          ) : personalLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><div className="h-6 w-40 bg-muted animate-pulse rounded" /></CardHeader>
                <CardContent><div className="h-64 bg-muted animate-pulse rounded" /></CardContent>
              </Card>
              <Card>
                <CardHeader><div className="h-6 w-40 bg-muted animate-pulse rounded" /></CardHeader>
                <CardContent><div className="h-64 bg-muted animate-pulse rounded" /></CardContent>
              </Card>
            </div>
          ) : personalError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{(personalError as Error).message}</p>
              </CardContent>
            </Card>
          ) : personalData ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-14 w-14 border-2 border-primary">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${personalData.profile.fullName}`} />
                  <AvatarFallback>{personalData.profile.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{personalData.profile.fullName}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline">{personalData.profile.category || "D"}</Badge>
                    <span className="font-medium"><span className="text-green-600">{personalData.profile.matchesWon}W</span> / <span className="text-red-500">{personalData.profile.matchesLost || (personalData.profile.matchesPlayed - personalData.profile.matchesWon)}L</span></span>
                    <span>({personalData.profile.matchesPlayed} played)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Match Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            labelFormatter={(label) => `${label}`}
                            formatter={(_: unknown, __: unknown, props: any) => [
                              props?.payload?.won ? 'Win' : 'Loss',
                              'Result'
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="result" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={({ cx, cy, payload }: any) => (
                              <circle
                                key={`${cx}-${cy}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={payload.won ? "#22c55e" : "#ef4444"}
                                stroke="none"
                              />
                            )}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No match history yet</p>
                          <p className="text-sm">Play some matches to see your progress!</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Match History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {personalData.matchHistory.length > 0 ? (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto">
                        {personalData.matchHistory.map((match) => (
                          <div 
                            key={match.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            data-testid={`match-history-${match.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${match.won ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                {match.won ? 'W' : 'L'}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {match.isTeamA ? `${match.scoreA} - ${match.scoreB}` : `${match.scoreB} - ${match.scoreA}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {match.completedAt ? format(new Date(match.completedAt), "MMM d, yyyy") : "Date unknown"}
                                </div>
                              </div>
                            </div>
                            <div className={`font-bold flex items-center gap-1 ${match.won ? 'text-green-600' : 'text-red-600'}`}>
                              {match.won ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {match.won ? 'W' : 'L'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No completed matches yet</p>
                          <p className="text-sm">Your match results will appear here.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      )}

      <PlayerStatsDialog
        playerId={statsPlayerId}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </div>
  );
}
