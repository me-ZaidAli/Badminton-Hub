import { usePlayers } from "@/hooks/use-players";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Rankings() {
  const { data: players, isLoading } = usePlayers();

  // Sort by ranking points desc
  const sortedPlayers = players?.sort((a, b) => 
    (b.playerProfile?.rankingPoints || 0) - (a.playerProfile?.rankingPoints || 0)
  );

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Club Rankings" 
        description="Top players based on Elo rating system."
      />

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
               // Simple loading skeleton
               [1, 2, 3, 4, 5].map(i => (
                 <TableRow key={i}>
                   <TableCell className="h-16"><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                   <TableCell><div className="w-32 h-4 bg-muted animate-pulse rounded" /></TableCell>
                   <TableCell colSpan={4} />
                 </TableRow>
               ))
            ) : sortedPlayers?.map((user, index) => {
              const profile = user.playerProfile;
              const winRate = profile?.matchesPlayed ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100) : 0;
              
              return (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-center font-bold text-lg text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                        <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{user.fullName}</div>
                        {index < 3 && <div className="text-xs text-amber-500 font-bold flex items-center gap-1"><Trophy className="w-3 h-3" /> Top 3</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">{profile?.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {profile?.matchesPlayed}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={winRate > 50 ? "text-green-600" : "text-muted-foreground"}>{winRate}%</span>
                      {/* Trend indicator placeholder */}
                      {winRate > 50 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg pr-8 text-primary">
                    {profile?.rankingPoints}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
