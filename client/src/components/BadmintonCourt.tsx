import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Play, Square, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Player = {
  id: number;
  fullName: string;
  category: string | null;
};

type MatchPlayer = {
  id: number;
  user: { fullName: string };
  category: string | null;
};

export type CourtMatch = {
  id: number;
  courtNumber: number | null;
  status: "QUEUED" | "LIVE" | "COMPLETED";
  teamAPlayer1: MatchPlayer;
  teamAPlayer2: MatchPlayer | null;
  teamBPlayer1: MatchPlayer;
  teamBPlayer2: MatchPlayer | null;
  scoreA: number | null;
  scoreB: number | null;
  startedAt: string | null;
  completedAt: string | null;
  queuePosition: number | null;
};

type BadmintonCourtProps = {
  courtNumber: number;
  match: CourtMatch | null;
  availablePlayers: Player[];
  isOrganiser: boolean;
  onStartMatch: (matchId: number, courtNumber: number) => void;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => void;
  onSwapPlayer: (matchId: number, position: string, newPlayerId: number) => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - startTime) / 1000));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-2 text-lg font-mono font-bold text-primary">
      <Clock className="w-5 h-5 animate-pulse" />
      {formatTime(elapsed)}
    </div>
  );
}

function PlayerSlot({
  player,
  position,
  availablePlayers,
  isOrganiser,
  onSwap,
}: {
  player: MatchPlayer | null;
  position: string;
  availablePlayers: Player[];
  isOrganiser: boolean;
  onSwap: (playerId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPlayers = availablePlayers.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  if (!player) return <div className="h-10 bg-muted/30 rounded flex items-center justify-center text-xs text-muted-foreground">Empty</div>;

  return (
    <>
      <div
        onClick={() => isOrganiser && setOpen(true)}
        className={cn(
          "px-3 py-2 bg-background rounded-lg border border-border/50 text-center transition-all",
          isOrganiser && "cursor-pointer hover:border-primary hover:bg-primary/5"
        )}
        data-testid={`player-slot-${position}`}
      >
        <div className="font-semibold text-sm truncate">{player.user.fullName}</div>
        <Badge variant="outline" className="text-xs mt-1">{player.category || "?"}</Badge>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Swap Player</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Search players..." value={search} onValueChange={setSearch} data-testid="input-search-player" />
            <CommandList>
              <CommandEmpty>No players found.</CommandEmpty>
              <CommandGroup>
                {filteredPlayers.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.fullName}
                    onSelect={() => {
                      onSwap(p.id);
                      setOpen(false);
                    }}
                    data-testid={`select-player-${p.id}`}
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

export function BadmintonCourt({
  courtNumber,
  match,
  availablePlayers,
  isOrganiser,
  onStartMatch,
  onCompleteMatch,
  onSwapPlayer,
}: BadmintonCourtProps) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [showScoreDialog, setShowScoreDialog] = useState(false);

  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA || 0);
      setScoreB(match.scoreB || 0);
    }
  }, [match]);

  const handleComplete = () => {
    if (match) {
      onCompleteMatch(match.id, scoreA, scoreB);
      setShowScoreDialog(false);
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/20" data-testid={`court-${courtNumber}`}>
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-lg font-bold px-3">Court {courtNumber}</Badge>
          {match?.status === "LIVE" && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 animate-pulse">LIVE</Badge>
          )}
        </div>
        {match?.status === "LIVE" && match.startedAt && (
          <LiveTimer startedAt={match.startedAt} />
        )}
      </div>

      <CardContent className="p-0">
        {!match ? (
          <div className="p-8 text-center text-muted-foreground bg-muted/20">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No match assigned</p>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="bg-green-600 p-4 min-h-[180px]">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[2px] h-full bg-white/30" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30 pointer-events-none" />
                <div className="absolute top-2 bottom-2 left-2 right-2 border-2 border-white/40 pointer-events-none" />
                <div className="absolute top-2 bottom-2 left-2 right-[calc(50%-1px)] border-r-0 border-2 border-white/20 pointer-events-none" />
                <div className="absolute top-2 bottom-2 right-2 left-[calc(50%+1px)] border-l-0 border-2 border-white/20 pointer-events-none" />
                
                <div className="relative z-10 flex h-full">
                  <div className="flex-1 flex flex-col justify-around items-center gap-2 px-2">
                    <PlayerSlot
                      player={match.teamAPlayer1}
                      position="teamAPlayer1"
                      availablePlayers={availablePlayers}
                      isOrganiser={isOrganiser && match.status !== "COMPLETED"}
                      onSwap={(id) => onSwapPlayer(match.id, "teamAPlayer1Id", id)}
                    />
                    {match.teamAPlayer2 && (
                      <PlayerSlot
                        player={match.teamAPlayer2}
                        position="teamAPlayer2"
                        availablePlayers={availablePlayers}
                        isOrganiser={isOrganiser && match.status !== "COMPLETED"}
                        onSwap={(id) => onSwapPlayer(match.id, "teamAPlayer2Id", id)}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-center px-4">
                    <div className="bg-white/90 rounded-lg px-4 py-2 shadow-lg">
                      {match.status === "COMPLETED" ? (
                        <div className="text-2xl font-bold font-mono">
                          <span className="text-primary">{match.scoreA}</span>
                          <span className="text-muted-foreground mx-2">-</span>
                          <span className="text-secondary">{match.scoreB}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">VS</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-around items-center gap-2 px-2">
                    <PlayerSlot
                      player={match.teamBPlayer1}
                      position="teamBPlayer1"
                      availablePlayers={availablePlayers}
                      isOrganiser={isOrganiser && match.status !== "COMPLETED"}
                      onSwap={(id) => onSwapPlayer(match.id, "teamBPlayer1Id", id)}
                    />
                    {match.teamBPlayer2 && (
                      <PlayerSlot
                        player={match.teamBPlayer2}
                        position="teamBPlayer2"
                        availablePlayers={availablePlayers}
                        isOrganiser={isOrganiser && match.status !== "COMPLETED"}
                        onSwap={(id) => onSwapPlayer(match.id, "teamBPlayer2Id", id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isOrganiser && (
              <div className="p-3 bg-muted/30 border-t border-border/50 flex justify-center gap-2">
                {match.status === "QUEUED" && (
                  <Button 
                    onClick={() => onStartMatch(match.id, courtNumber)} 
                    className="gap-2"
                    data-testid={`button-start-match-${match.id}`}
                  >
                    <Play className="w-4 h-4" /> Start Match
                  </Button>
                )}
                {match.status === "LIVE" && (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowScoreDialog(true)}
                    className="gap-2"
                    data-testid={`button-complete-match-${match.id}`}
                  >
                    <Square className="w-4 h-4" /> End Match
                  </Button>
                )}
                {match.status === "COMPLETED" && (
                  <Badge variant="secondary">Completed</Badge>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Final Scores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {match?.teamAPlayer1.user.fullName}
                  {match?.teamAPlayer2 && ` & ${match.teamAPlayer2.user.fullName}`}
                </label>
                <Input 
                  type="number" 
                  min="0" 
                  max="30"
                  value={scoreA} 
                  onChange={(e) => setScoreA(Number(e.target.value))}
                  className="text-2xl text-center font-bold h-14"
                  data-testid="input-score-a"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {match?.teamBPlayer1.user.fullName}
                  {match?.teamBPlayer2 && ` & ${match.teamBPlayer2.user.fullName}`}
                </label>
                <Input 
                  type="number" 
                  min="0" 
                  max="30"
                  value={scoreB} 
                  onChange={(e) => setScoreB(Number(e.target.value))}
                  className="text-2xl text-center font-bold h-14"
                  data-testid="input-score-b"
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleComplete} data-testid="button-confirm-complete">
              Confirm & Complete Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
