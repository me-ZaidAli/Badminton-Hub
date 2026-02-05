import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Search, Users, Filter } from "lucide-react";
import { useState } from "react";

export default function Players() {
  const { data: user } = useUser();
  const { data: players, isLoading } = usePlayers();
  const { data: clubs } = useClubs();
  const [search, setSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const isSuperUser = user?.role === "OWNER";

  // Filter by search and optionally by club for super users
  const filteredPlayers = players?.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesClub = selectedClubId === "all" || 
      p.playerProfile?.clubId === Number(selectedClubId);
    return matchesSearch && matchesClub;
  });

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "A": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "B": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "C": return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      case "D": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Players
          </h1>
          <p className="text-muted-foreground">Browse all club members.</p>
        </div>
        <div className="flex items-center gap-4">
          {isSuperUser && clubs && clubs.length > 0 && (
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {clubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search players..." 
              className="pl-10" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-players"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredPlayers?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No players found matching "{search}"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers?.map((player) => (
            <Card key={player.id} className="border-border/50 hover-elevate" data-testid={`card-player-${player.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                    <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{player.fullName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getCategoryColor(player.playerProfile?.category || null)}>
                        {player.playerProfile?.category || "N/A"}
                      </Badge>
                      {player.playerProfile && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {player.playerProfile.rankingPoints} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {player.playerProfile && (
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Matches</span>
                    <span className="font-medium">
                      {player.playerProfile.matchesWon} / {player.playerProfile.matchesPlayed}
                      <span className="text-muted-foreground ml-1">
                        ({player.playerProfile.matchesPlayed > 0 
                          ? Math.round((player.playerProfile.matchesWon / player.playerProfile.matchesPlayed) * 100) 
                          : 0}%)
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
