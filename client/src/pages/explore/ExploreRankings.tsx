import { useState, useEffect, useMemo } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useClubs, useLeaderboard } from "@/hooks/use-clubs";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import { Trophy, Loader2, ChevronsUpDown, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExploreRankings() {
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    if (!locationSearch.trim()) return clubs;
    const query = locationSearch.toLowerCase().trim();
    return clubs.filter((club) => {
      const city = (club.city || "").toLowerCase();
      const postcode = (club.postcode || "").toLowerCase();
      const address = (club.address || "").toLowerCase();
      return city.includes(query) || postcode.includes(query) || address.includes(query);
    });
  }, [clubs, locationSearch]);

  useEffect(() => {
    if (clubs?.length && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  useEffect(() => {
    if (locationSearch.trim() && filteredClubs.length > 0) {
      setSelectedClubId(filteredClubs[0].id);
    }
  }, [filteredClubs, locationSearch]);

  const selectedClubName = clubs?.find((c) => c.id === selectedClubId)?.name;

  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(selectedClubId);
  const topPlayers = leaderboard?.slice(0, 20) || [];

  const handlePlayerClick = (playerId: number) => {
    setStatsPlayerId(playerId);
    setStatsOpen(true);
  };

  return (
    <PublicLayout>
      <section className="py-12" data-testid="section-explore-rankings">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Club Rankings</h1>
            <p className="text-muted-foreground text-lg">See how players are ranked across clubs</p>
          </div>

          {clubs && clubs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <div className="relative w-[250px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by city, postcode..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-location-search"
                />
              </div>

              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-[250px] justify-between"
                    data-testid="select-ranking-club"
                  >
                    {selectedClubName || "Select a club..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <Command>
                    <CommandInput placeholder="Search clubs..." data-testid="input-club-search" />
                    <CommandList>
                      <CommandEmpty>No clubs found.</CommandEmpty>
                      <CommandGroup>
                        {filteredClubs.map((club) => (
                          <CommandItem
                            key={club.id}
                            value={club.name}
                            onSelect={() => {
                              setSelectedClubId(club.id);
                              setComboboxOpen(false);
                            }}
                            data-testid={`select-ranking-club-${club.id}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClubId === club.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{club.name}</span>
                              {(club.city || club.postcode) && (
                                <span className="text-xs text-muted-foreground">
                                  {[club.city, club.postcode].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Card className="overflow-hidden border-border/50" data-testid="card-rankings-leaderboard">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Players
              </CardTitle>
              <CardDescription>Click a player to view detailed stats</CardDescription>
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
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handlePlayerClick(player.id)}
                        className="flex items-center gap-3 bg-background/95 rounded-lg px-4 py-2 shadow-lg w-full max-w-md cursor-pointer hover-elevate text-left"
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
                            <span>{player.matchesWon}W / {player.matchesLost}L ({player.matchesPlayed} played)</span>
                          </div>
                        </div>
                        <div className="text-right font-bold text-sm text-foreground">{player.winPercentage}%</div>
                      </button>
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

      <PlayerStatsDialog
        playerId={statsPlayerId}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </PublicLayout>
  );
}
