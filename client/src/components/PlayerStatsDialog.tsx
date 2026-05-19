import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDetailedPlayerStats, type DetailedPlayerStats } from "@/hooks/use-clubs";
import { usePlayerTournamentStats } from "@/hooks/use-tournaments";
import {
  TrendingUp, TrendingDown, Target, Percent, Swords, Loader2,
  Building2, Flame, Star, Award, Zap, Medal, Calendar, Users, Trophy
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

function computeAchievements(stats: DetailedPlayerStats) {
  const badges: { icon: any; label: string; description: string; color: string }[] = [];

  let currentStreak = 0;
  let maxStreak = 0;
  for (const m of [...stats.matchHistory].reverse()) {
    if (m.won) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  if (maxStreak >= 5) {
    badges.push({ icon: Flame, label: "Hot Streak", description: `${maxStreak} wins in a row`, color: "text-orange-500" });
  }

  if (stats.matchesWon >= 1) {
    badges.push({ icon: Zap, label: "First Win", description: "Won their first match", color: "text-green-500" });
  }

  if (stats.matchesPlayed >= 10) {
    badges.push({ icon: Star, label: "Veteran", description: "10+ matches played", color: "text-amber-500" });
  }

  if (stats.winRatio >= 75 && stats.matchesPlayed >= 4) {
    badges.push({ icon: Award, label: "Top Performer", description: "75%+ win rate", color: "text-purple-500" });
  }

  if (stats.winRatio === 100 && stats.matchesPlayed >= 3) {
    badges.push({ icon: Medal, label: "Undefeated", description: "10 consecutive wins", color: "text-yellow-500" });
  }

  return badges;
}

export function PlayerStatsDialog({
  profileId,
  open,
  onOpenChange,
}: {
  profileId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: stats, isLoading } = useDetailedPlayerStats(open ? profileId : null);
  const { data: tStats } = usePlayerTournamentStats(open ? profileId : null);

  const chartData = stats?.matchHistory
    ? [...stats.matchHistory]
        .reverse()
        .map((match, index) => ({
          match: index + 1,
          date: match.completedAt
            ? format(new Date(match.completedAt), "MMM d")
            : `#${index + 1}`,
          result: match.won ? "W" : "L",
          won: match.won,
        }))
    : [];

  const achievements = stats ? computeAchievements(stats) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Stats</DialogTitle>
          <DialogDescription>Detailed statistics and match history</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin w-6 h-6 text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-primary">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${stats.fullName}`} />
                <AvatarFallback>{stats.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold truncate" data-testid="text-player-name">{stats.fullName}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{stats.grade || stats.category || "C3"}</Badge>
                  {stats.gender && (
                    <Badge variant="secondary" className="text-xs">{stats.gender}</Badge>
                  )}
                  {stats.isJunior && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Junior</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{stats.clubName}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Swords className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xl font-bold" data-testid="text-matches-played">{stats.matchesPlayed}</div>
                  <div className="text-xs text-muted-foreground">Played</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
                  <div className="text-xl font-bold text-green-600" data-testid="text-matches-won">{stats.matchesWon}</div>
                  <div className="text-xs text-muted-foreground">Won</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-500" />
                  <div className="text-xl font-bold text-red-500" data-testid="text-matches-lost">{stats.matchesLost}</div>
                  <div className="text-xs text-muted-foreground">Lost</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Percent className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className={`text-xl font-bold ${stats.winRatio >= 50 ? "text-green-600" : "text-muted-foreground"}`} data-testid="text-win-percentage">
                    {stats.winRatio}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>
            </div>

            {stats.recentForm.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Form</h4>
                <div className="flex items-center gap-1.5">
                  {stats.recentForm.map((won, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        won
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      }`}
                      data-testid={`form-indicator-${i}`}
                    >
                      {won ? "W" : "L"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {achievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Achievements</h4>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5">
                      <a.icon className={`w-4 h-4 ${a.color}`} />
                      <div>
                        <div className="text-xs font-semibold">{a.label}</div>
                        <div className="text-[10px] text-muted-foreground">{a.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tStats && tStats.tournamentsPlayed > 0 && (
              <div data-testid="player-tournament-stats">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Tournament Record
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                      <div className="text-xl font-bold" data-testid="text-tournaments-played">{tStats.tournamentsPlayed}</div>
                      <div className="text-xs text-muted-foreground">Tournaments</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Swords className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-xl font-bold" data-testid="text-t-matches-played">{tStats.matchesPlayed}</div>
                      <div className="text-xs text-muted-foreground">Matches</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
                      <div className="text-xl font-bold text-green-600" data-testid="text-t-matches-won">{tStats.matchesWon}</div>
                      <div className="text-xs text-muted-foreground">Won</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Percent className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <div className={`text-xl font-bold ${tStats.winRate >= 50 ? "text-green-600" : "text-muted-foreground"}`} data-testid="text-t-win-rate">
                        {tStats.winRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </CardContent>
                  </Card>
                </div>
                {tStats.tournaments.length > 0 && (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {tStats.tournaments.slice(0, 8).map((t) => (
                      <div key={t.tournamentId} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 text-sm" data-testid={`tournament-row-${t.tournamentId}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{t.tournamentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.endDate ? format(new Date(t.endDate), "MMM yyyy") : "—"}
                            {t.categories > 1 && ` · ${t.categories} categories`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <div className="text-center">
                            <div className="font-mono font-bold text-green-600">{t.matchesWon}</div>
                            <div className="text-[10px] text-muted-foreground">W</div>
                          </div>
                          <div className="text-center">
                            <div className="font-mono font-bold text-red-500">{t.matchesLost}</div>
                            <div className="text-[10px] text-muted-foreground">L</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {chartData.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--foreground)" }} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(_: unknown, __: unknown, props: { payload?: { result: string } }) => [
                          props?.payload?.result === "W" ? "Win" : "Loss",
                          "Result",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey={(entry: { won: boolean }) => (entry.won ? 1 : 0)}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={({ cx, cy, payload }: { cx: number; cy: number; payload: { won: boolean } }) => (
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
                </CardContent>
              </Card>
            )}

            {stats.matchHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Match History ({stats.matchHistory.length})
                </h4>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {stats.matchHistory.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-lg bg-muted/40 text-sm"
                      data-testid={`stat-match-${match.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          match.won
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        }`}>
                          {match.won ? "W" : "L"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-medium">
                            {match.isTeamA
                              ? `${match.scoreA} - ${match.scoreB}`
                              : `${match.scoreB} - ${match.scoreA}`}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            vs {match.opponent1}
                            {match.opponent2 && ` & ${match.opponent2}`}
                            {match.partner && (
                              <span className="ml-1 opacity-75">
                                (w/ {match.partner})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-right shrink-0 pl-9 sm:pl-0">
                        <span className="truncate max-w-[120px]">{match.sessionTitle}</span>
                        {match.completedAt && (
                          <span className="whitespace-nowrap">
                            {format(new Date(match.completedAt), "MMM d, yy")}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[9px] py-0 shrink-0">
                          {match.playersPerSide === 1 ? "S" : "D"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
