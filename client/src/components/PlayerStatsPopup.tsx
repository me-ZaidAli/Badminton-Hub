import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, TrendingUp, TrendingDown } from "lucide-react";

interface PlayerStats {
  id: number;
  fullName: string;
  category: string | null;
  gender: string | null;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRatio: number;
  recentForm: boolean[];
}

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

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case "A": return "bg-green-500/10 text-green-600 border-green-500/30";
    case "B": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    case "C": return "bg-orange-500/10 text-orange-600 border-orange-500/30";
    case "D": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

interface PlayerStatsPopupProps {
  profileId: number | null;
  playerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerStatsPopup({ profileId, playerName, open, onOpenChange }: PlayerStatsPopupProps) {
  const { data: stats, isLoading } = usePlayerStats(open ? profileId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Player Statistics</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${stats.fullName}`} />
                <AvatarFallback>{stats.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold">{stats.fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={getCategoryColor(stats.grade || stats.category)}>
                    {stats.grade || stats.category || "C3"}
                  </Badge>
                  {stats.gender && (
                    <Badge variant="secondary">{stats.gender}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <Card>
                <CardContent className="p-3">
                  <p className="text-2xl font-bold">{stats.matchesPlayed}</p>
                  <p className="text-xs text-muted-foreground">Matches</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-2xl font-bold text-green-600">{stats.matchesWon}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-2xl font-bold text-red-500">{stats.matchesLost}</p>
                  <p className="text-xs text-muted-foreground">Losses</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Target className="w-4 h-4" /> Win Rate
                </span>
                <span className="text-sm font-bold">{stats.winRatio}%</span>
              </div>
              <Progress value={stats.winRatio} className="h-3" />
            </div>

            {stats.recentForm.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recent Form</p>
                <div className="flex gap-2">
                  {stats.recentForm.map((won, index) => (
                    <Badge 
                      key={index} 
                      variant={won ? "default" : "destructive"}
                      className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                    >
                      {won ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last {stats.recentForm.length} matches</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Could not load player statistics</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
