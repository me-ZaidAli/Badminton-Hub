import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Target, Percent, Swords, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

type PlayerStats = {
  id: number;
  fullName: string;
  category: string | null;
  gender: string | null;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRatio: number;
  recentForm: boolean[];
  matchHistory: {
    id: number;
    scoreA: number | null;
    scoreB: number | null;
    isTeamA: boolean;
    won: boolean;
    completedAt: string | null;
  }[];
};

function usePlayerStats(profileId: number | null) {
  return useQuery<PlayerStats>({
    queryKey: ["/api/players", profileId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${profileId}/stats`);
      if (!res.ok) throw new Error("Failed to fetch player stats");
      return res.json();
    },
    enabled: profileId !== null,
  });
}

export function PlayerStatsDialog({
  playerId,
  open,
  onOpenChange,
}: {
  playerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: stats, isLoading } = usePlayerStats(open ? playerId : null);

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

  const winStreak = stats?.matchHistory
    ? stats.matchHistory.reduce((streak, m) => {
        if (m.won && streak >= 0) return streak + 1;
        return streak;
      }, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Stats</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin w-6 h-6 text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-primary">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${stats.fullName}`}
                />
                <AvatarFallback>
                  {stats.fullName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold" data-testid="text-player-name">
                  {stats.fullName}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stats.category || "D"}</Badge>
                  {stats.gender && (
                    <Badge variant="secondary" className="text-xs">
                      {stats.gender}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Swords className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xl font-bold" data-testid="text-matches-played">
                    {stats.matchesPlayed}
                  </div>
                  <div className="text-xs text-muted-foreground">Played</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-bold text-green-600" data-testid="text-matches-won">
                      {stats.matchesWon}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-xl font-bold text-red-500" data-testid="text-matches-lost">
                      {stats.matchesLost}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">W / L</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Percent className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div
                    className={`text-xl font-bold ${stats.winRatio >= 50 ? "text-green-600" : "text-muted-foreground"}`}
                    data-testid="text-win-percentage"
                  >
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
                  {winStreak > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {winStreak} win streak
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {chartData.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Match Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(_: unknown, __: unknown, props: { payload: { result: string } }) => [
                          props.payload.result === "W" ? "Win" : "Loss",
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
                  Match History ({stats.matchHistory.length})
                </h4>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {stats.matchHistory.slice(0, 20).map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm"
                      data-testid={`stat-match-${match.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            match.won
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          }`}
                        >
                          {match.won ? "W" : "L"}
                        </div>
                        <span className="font-mono font-medium">
                          {match.isTeamA
                            ? `${match.scoreA} - ${match.scoreB}`
                            : `${match.scoreB} - ${match.scoreA}`}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {match.completedAt
                          ? format(new Date(match.completedAt), "MMM d, yyyy")
                          : ""}
                      </span>
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
