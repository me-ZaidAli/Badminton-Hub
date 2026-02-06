import { useState, useEffect } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClubs, useLeaderboard } from "@/hooks/use-clubs";
import { Trophy, Loader2 } from "lucide-react";

export default function ExploreRankings() {
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  useEffect(() => {
    if (clubs?.length && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(selectedClubId);
  const topPlayers = leaderboard?.slice(0, 20) || [];

  return (
    <PublicLayout>
      <section className="py-12" data-testid="section-explore-rankings">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Club Rankings</h1>
            <p className="text-muted-foreground text-lg">See how players are ranked across clubs</p>
          </div>

          {clubs && clubs.length > 0 && (
            <div className="flex justify-center mb-8">
              <div className="flex flex-wrap items-center gap-2">
                {clubs.map(club => (
                  <Button
                    key={club.id}
                    variant={selectedClubId === club.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedClubId(club.id)}
                    data-testid={`button-ranking-club-${club.id}`}
                  >
                    {club.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Card className="overflow-hidden border-border/50" data-testid="card-rankings-leaderboard">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Players
              </CardTitle>
              <CardDescription>Ranked by points earned through matches</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative bg-green-600 p-6 min-h-[400px]">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[2px] h-full bg-white/30" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30 pointer-events-none" />
                <div className="absolute top-2 bottom-2 left-2 right-2 border-2 border-white/40 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-2 py-4">
                  {leaderboardLoading ? (
                    <div className="text-white/80 text-sm py-8 flex items-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4" /> Loading leaderboard...
                    </div>
                  ) : topPlayers.length > 0 ? (
                    topPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 bg-background/95 rounded-lg px-4 py-2 shadow-lg w-full max-w-md"
                        data-testid={`ranking-player-${player.id}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-amber-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-amber-700 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{player.fullName}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{player.category || "D"}</Badge>
                            <span>{player.matchesWon}W / {player.matchesPlayed}P</span>
                          </div>
                        </div>
                        <div className="text-right font-bold text-primary">{player.rankingPoints}</div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-background/90 rounded-lg px-6 py-8 text-center">
                      <p className="text-muted-foreground">No players ranked yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Players start at 0 points and earn rankings through matches</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
