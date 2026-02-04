import { useState } from "react";
import { useClubs, useLeaderboard, usePersonalRanking } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, Minus, User, Calendar, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";

export default function Rankings() {
  const { data: user } = useUser();
  const { data: clubs, isLoading: clubsLoading } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"club" | "personal">("club");
  
  // Auto-select first club if none selected
  const clubId = selectedClubId ?? clubs?.[0]?.id ?? null;
  
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(clubId);
  const { data: personalData, isLoading: personalLoading, error: personalError } = usePersonalRanking(
    viewMode === "personal" && clubId ? clubId : null
  );

  const isLoading = clubsLoading || (viewMode === "club" ? leaderboardLoading : personalLoading);

  // Generate chart data from match history
  const chartData = personalData?.matchHistory ? 
    [...personalData.matchHistory]
      .reverse()
      .reduce((acc, match, index) => {
        const prevPoints = index === 0 
          ? personalData.profile.rankingPoints - personalData.matchHistory.reduce((sum, m) => sum + m.pointsChange, 0)
          : acc[acc.length - 1].points;
        acc.push({
          match: index + 1,
          points: prevPoints + match.pointsChange,
          date: match.completedAt ? format(new Date(match.completedAt), "MMM d") : `Match ${index + 1}`
        });
        return acc;
      }, [] as { match: number; points: number; date: string }[])
    : [];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Club Rankings" 
        description="Top players based on Elo rating system."
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
                <TableHead className="text-right">Matches</TableHead>
                <TableHead className="text-right">Win %</TableHead>
                <TableHead className="text-right pr-8">Points</TableHead>
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
              ) : leaderboard?.map((player, index) => {
                const winRate = player.matchesPlayed ? Math.round((player.matchesWon / player.matchesPlayed) * 100) : 0;
                
                return (
                  <TableRow key={player.id} className="hover:bg-muted/30 transition-colors" data-testid={`leaderboard-row-${player.id}`}>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={winRate > 50 ? "text-green-600" : "text-muted-foreground"}>{winRate}%</span>
                        {winRate > 50 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg pr-8 text-primary">
                      {player.rankingPoints}
                    </TableCell>
                  </TableRow>
                );
              })}
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
                    <span className="font-bold text-primary text-lg">{personalData.profile.rankingPoints} pts</span>
                    <Badge variant="outline">{personalData.profile.category || "D"}</Badge>
                    <span>{personalData.profile.matchesWon}/{personalData.profile.matchesPlayed} wins</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Ranking Progress
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
                          <YAxis 
                            domain={['dataMin - 20', 'dataMax + 20']}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelFormatter={(label) => `Date: ${label}`}
                            formatter={(value: number) => [`${value} pts`, 'Ranking']}
                          />
                          <ReferenceLine y={1000} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                          <Line 
                            type="monotone" 
                            dataKey="points" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
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
                            <div className={`font-bold flex items-center gap-1 ${match.pointsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {match.pointsChange > 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {match.pointsChange > 0 ? '+' : ''}{match.pointsChange}
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
    </div>
  );
}
