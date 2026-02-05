import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Check, GripVertical, ArrowRight, Users, Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CourtMatch } from "./BadmintonCourt";
import { useEditMatchScore } from "@/hooks/use-matches";

type Player = {
  id: number;
  fullName: string;
  category: string | null;
};

type MatchQueueProps = {
  matches: CourtMatch[];
  availablePlayers: Player[];
  isOrganiser: boolean;
  onSwapPlayer: (matchId: number, position: string, newPlayerId: number) => void;
  onAssignToCourt: (matchId: number, courtNumber: number) => void;
  availableCourts: number[];
};

function PlayerBadge({
  player,
  position,
  matchId,
  availablePlayers,
  isOrganiser,
  onSwap,
}: {
  player: { id: number; user: { fullName: string }; category: string | null } | null;
  position: string;
  matchId: number;
  availablePlayers: Player[];
  isOrganiser: boolean;
  onSwap: (matchId: number, position: string, playerId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPlayers = availablePlayers.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  if (!player) return null;

  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          "text-xs py-1",
          isOrganiser && "cursor-pointer hover:bg-primary/10"
        )}
        onClick={() => isOrganiser && setOpen(true)}
        data-testid={`queue-player-${matchId}-${position}`}
      >
        {player.user.fullName}
      </Badge>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Swap Player</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Search players..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No players found.</CommandEmpty>
              <CommandGroup>
                {filteredPlayers.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.fullName}
                    onSelect={() => {
                      onSwap(matchId, position, p.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", player.id === p.id ? "opacity-100" : "opacity-0")} />
                    {p.fullName} ({p.category || "?"})
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MatchQueue({
  matches,
  availablePlayers,
  isOrganiser,
  onSwapPlayer,
  onAssignToCourt,
  availableCourts,
}: MatchQueueProps) {
  const queuedMatches = matches
    .filter(m => m.status === "QUEUED")
    .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

  if (queuedMatches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No matches in queue</p>
          <p className="text-sm">Generate matches to fill the queue</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GripVertical className="w-5 h-5" />
          Match Queue ({queuedMatches.length} pending)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 p-4">
            {queuedMatches.map((match, index) => (
              <div
                key={match.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
                data-testid={`queue-match-${match.id}`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1 mb-1">
                    <PlayerBadge
                      player={match.teamAPlayer1}
                      position="teamAPlayer1Id"
                      matchId={match.id}
                      availablePlayers={availablePlayers}
                      isOrganiser={isOrganiser}
                      onSwap={onSwapPlayer}
                    />
                    {match.teamAPlayer2 && (
                      <>
                        <span className="text-muted-foreground">&</span>
                        <PlayerBadge
                          player={match.teamAPlayer2}
                          position="teamAPlayer2Id"
                          matchId={match.id}
                          availablePlayers={availablePlayers}
                          isOrganiser={isOrganiser}
                          onSwap={onSwapPlayer}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <span>vs</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <PlayerBadge
                      player={match.teamBPlayer1}
                      position="teamBPlayer1Id"
                      matchId={match.id}
                      availablePlayers={availablePlayers}
                      isOrganiser={isOrganiser}
                      onSwap={onSwapPlayer}
                    />
                    {match.teamBPlayer2 && (
                      <>
                        <span className="text-muted-foreground">&</span>
                        <PlayerBadge
                          player={match.teamBPlayer2}
                          position="teamBPlayer2Id"
                          matchId={match.id}
                          availablePlayers={availablePlayers}
                          isOrganiser={isOrganiser}
                          onSwap={onSwapPlayer}
                        />
                      </>
                    )}
                  </div>
                </div>

                {isOrganiser && availableCourts.length > 0 && (
                  <div className="flex items-center gap-2">
                    {availableCourts.slice(0, 2).map(court => (
                      <Button
                        key={court}
                        size="sm"
                        variant="outline"
                        onClick={() => onAssignToCourt(match.id, court)}
                        className="gap-1"
                        data-testid={`button-assign-${match.id}-court-${court}`}
                      >
                        <ArrowRight className="w-3 h-3" />
                        Court {court}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function CompletedMatches({ matches, isOrganiser = false }: { matches: CourtMatch[]; isOrganiser?: boolean }) {
  const [editMatch, setEditMatch] = useState<CourtMatch | null>(null);
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);
  const { mutate: editScore, isPending } = useEditMatchScore();

  const completedMatches = matches
    .filter(m => m.status === "COMPLETED")
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  if (completedMatches.length === 0) return null;

  const openEditDialog = (match: CourtMatch) => {
    setEditMatch(match);
    setEditScoreA(match.scoreA || 0);
    setEditScoreB(match.scoreB || 0);
  };

  const handleSaveScore = () => {
    if (editMatch) {
      editScore({ matchId: editMatch.id, scoreA: editScoreA, scoreB: editScoreB }, {
        onSuccess: () => setEditMatch(null)
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Completed Matches ({completedMatches.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 p-4">
              {completedMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  data-testid={`completed-match-${match.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {match.teamAPlayer1.user.fullName}
                      {match.teamAPlayer2 && ` & ${match.teamAPlayer2.user.fullName}`}
                    </span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="text-sm">
                      {match.teamBPlayer1.user.fullName}
                      {match.teamBPlayer2 && ` & ${match.teamBPlayer2.user.fullName}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(match.scoreA || 0) > (match.scoreB || 0) ? "default" : "secondary"} className="font-mono">
                      {match.scoreA} - {match.scoreB}
                    </Badge>
                    {isOrganiser && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => openEditDialog(match)}
                        data-testid={`button-edit-match-${match.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!editMatch} onOpenChange={(open) => !open && setEditMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match Score</DialogTitle>
          </DialogHeader>
          {editMatch && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {editMatch.teamAPlayer1.user.fullName}
                    {editMatch.teamAPlayer2 && ` & ${editMatch.teamAPlayer2.user.fullName}`}
                  </label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="30"
                    value={editScoreA} 
                    onChange={(e) => setEditScoreA(Number(e.target.value))}
                    className="text-2xl text-center font-bold h-14"
                    data-testid="input-edit-score-a"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {editMatch.teamBPlayer1.user.fullName}
                    {editMatch.teamBPlayer2 && ` & ${editMatch.teamBPlayer2.user.fullName}`}
                  </label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="30"
                    value={editScoreB} 
                    onChange={(e) => setEditScoreB(Number(e.target.value))}
                    className="text-2xl text-center font-bold h-14"
                    data-testid="input-edit-score-b"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSaveScore} disabled={isPending} data-testid="button-save-edit-score">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
