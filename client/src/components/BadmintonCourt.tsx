import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Play, Square, Clock, Users, Pencil, Trophy, ArrowRight, RotateCcw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import courtImage from "@assets/image_1770246183034.png";

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
  pointsToPlayTo?: number | null;
  scoreEnteredByUserId?: number | null;
  scoreEnteredAt?: string | null;
  scoreEnteredByUser?: { id: number; fullName: string } | null;
  scoreUpdatedByUserId?: number | null;
  scoreUpdatedAt?: string | null;
  scoreUpdatedByUser?: { id: number; fullName: string } | null;
};

type BadmintonCourtProps = {
  courtNumber: number;
  courtName?: string;
  match: CourtMatch | null;
  availablePlayers: Player[];
  isOrganiser: boolean;
  isSignedUp: boolean;
  onStartMatch: (matchId: number, courtNumber: number) => void;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onSwapPlayer: (matchId: number, position: string, newPlayerId: number) => void;
  onCourtNameChange?: (courtNumber: number, name: string) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  defaultPointsToPlayTo?: number;
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
  courtName,
  match,
  availablePlayers,
  isOrganiser,
  isSignedUp,
  onStartMatch,
  onCompleteMatch,
  onSwapPlayer,
  onCourtNameChange,
  onUpdatePointsTarget,
  defaultPointsToPlayTo = 21,
}: BadmintonCourtProps) {
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [finishStep, setFinishStep] = useState<1 | 2 | 3 | 4>(1);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const [winnerScore, setWinnerScore] = useState<string>("");
  const [loserScore, setLoserScore] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(courtName || `Court ${courtNumber}`);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const target = match?.pointsToPlayTo || defaultPointsToPlayTo;

  useEffect(() => {
    setEditName(courtName || `Court ${courtNumber}`);
  }, [courtName, courtNumber]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const openFinishDialog = () => {
    setFinishStep(1);
    setWinner(null);
    setWinnerScore("");
    setLoserScore("");
    setShowSuccess(false);
    setShowScoreDialog(true);
  };

  const resetFinishFlow = () => {
    setFinishStep(1);
    setWinner(null);
    setWinnerScore("");
    setLoserScore("");
  };

  const getTeamALabel = () => {
    if (!match) return "Team A";
    return match.teamAPlayer2
      ? `${match.teamAPlayer1.user.fullName} & ${match.teamAPlayer2.user.fullName}`
      : match.teamAPlayer1.user.fullName;
  };

  const getTeamBLabel = () => {
    if (!match) return "Team B";
    return match.teamBPlayer2
      ? `${match.teamBPlayer1.user.fullName} & ${match.teamBPlayer2.user.fullName}`
      : match.teamBPlayer1.user.fullName;
  };

  const getWinnerLabel = () => winner === "A" ? getTeamALabel() : getTeamBLabel();
  const getLoserLabel = () => winner === "A" ? getTeamBLabel() : getTeamALabel();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalConfirm = async () => {
    if (!match || !winner || !winnerScore || !loserScore) return;
    const wScore = Number(winnerScore);
    const lScore = Number(loserScore);
    const sA = winner === "A" ? wScore : lScore;
    const sB = winner === "B" ? wScore : lScore;
    setIsSubmitting(true);
    try {
      const result = onCompleteMatch(match.id, sA, sB);
      if (result && typeof (result as any).then === "function") {
        await result;
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowScoreDialog(false);
        setShowSuccess(false);
      }, 2000);
    } catch {
      // Error handled by parent mutation toast - dialog stays open for amendment
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSave = () => {
    const trimmed = editName.trim();
    if (trimmed && onCourtNameChange) {
      onCourtNameChange(courtNumber, trimmed);
    }
    setIsEditingName(false);
  };

  const displayName = courtName || `Court ${courtNumber}`;

  return (
    <Card className="overflow-hidden border-2 border-primary/20" data-testid={`court-${courtNumber}`}>
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-3 flex items-center justify-between gap-2 border-b border-border/50 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditingName ? (
            <Input
              ref={nameInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") { setEditName(displayName); setIsEditingName(false); }
              }}
              className="w-40 text-sm font-bold"
              data-testid={`input-court-name-${courtNumber}`}
            />
          ) : (
            <Badge
              variant="default"
              className={cn("text-lg font-bold px-3", isOrganiser && "cursor-pointer")}
              onClick={() => isOrganiser && setIsEditingName(true)}
              data-testid={`badge-court-name-${courtNumber}`}
            >
              {displayName}
              {isOrganiser && <Pencil className="w-3 h-3 ml-1.5 inline-block opacity-70" />}
            </Badge>
          )}
          {match?.status === "LIVE" && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 animate-pulse">LIVE</Badge>
          )}
          {match && (
            isEditingTarget && isOrganiser ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Play to</span>
                <input
                  type="number"
                  min="1"
                  className="w-14 border rounded px-1.5 py-0.5 text-xs bg-background text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  defaultValue={target}
                  autoFocus
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val !== target && match && onUpdatePointsTarget) {
                      onUpdatePointsTarget(match.id, val);
                    }
                    setIsEditingTarget(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = parseInt((e.target as HTMLInputElement).value, 10);
                      if (!isNaN(val) && val >= 1 && val !== target && match && onUpdatePointsTarget) {
                        onUpdatePointsTarget(match.id, val);
                      }
                      setIsEditingTarget(false);
                    }
                    if (e.key === "Escape") setIsEditingTarget(false);
                  }}
                  data-testid={`input-points-target-${match.id}`}
                />
              </div>
            ) : (
              <Badge
                variant="outline"
                className={cn("text-xs", isOrganiser && "cursor-pointer")}
                onClick={() => isOrganiser && setIsEditingTarget(true)}
                data-testid={`badge-points-target-${match.id}`}
              >
                Play to {target}
                {isOrganiser && <Pencil className="w-2.5 h-2.5 ml-1 inline-block opacity-60" />}
              </Badge>
            )
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
              <div 
                className="p-4 min-h-[180px] bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${courtImage})` }}
              >
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

            {(isOrganiser || isSignedUp) && (
              <div className="p-3 bg-muted/30 border-t border-border/50 flex justify-center gap-2">
                {match.status === "QUEUED" && isOrganiser && (
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
                    onClick={openFinishDialog}
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

      <Dialog open={showScoreDialog} onOpenChange={(open) => { if (!open) { setShowScoreDialog(false); resetFinishFlow(); setShowSuccess(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showSuccess ? "Match Saved" : finishStep === 1 ? "Who won the match?" : finishStep === 2 ? "Winning team score" : finishStep === 3 ? "Losing team score" : "Confirm match result"}
            </DialogTitle>
            <DialogDescription className="sr-only">Enter the final match scores step by step</DialogDescription>
          </DialogHeader>

          {showSuccess ? (
            <div className="py-8 text-center space-y-3" data-testid="finish-success">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Thank you. Match results have been saved.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "w-8 h-1.5 rounded-full transition-colors",
                      s <= finishStep ? "bg-primary" : "bg-muted"
                    )}
                    data-testid={`step-indicator-${s}`}
                  />
                ))}
              </div>

              {finishStep === 1 && (
                <div className="space-y-3 pt-2" data-testid="finish-step-1">
                  <p className="text-sm text-muted-foreground text-center">Select the winning team</p>
                  <div className="space-y-2">
                    <Button
                      variant={winner === "A" ? "default" : "outline"}
                      className="w-full justify-start gap-3 py-6"
                      onClick={() => setWinner("A")}
                      data-testid="button-select-team-a"
                    >
                      <Trophy className={cn("w-5 h-5", winner === "A" ? "text-yellow-300" : "text-muted-foreground")} />
                      <span className="text-left flex-1 truncate">{getTeamALabel()}</span>
                      {winner === "A" && <Check className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant={winner === "B" ? "default" : "outline"}
                      className="w-full justify-start gap-3 py-6"
                      onClick={() => setWinner("B")}
                      data-testid="button-select-team-b"
                    >
                      <Trophy className={cn("w-5 h-5", winner === "B" ? "text-yellow-300" : "text-muted-foreground")} />
                      <span className="text-left flex-1 truncate">{getTeamBLabel()}</span>
                      {winner === "B" && <Check className="w-5 h-5" />}
                    </Button>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setFinishStep(2)}
                    disabled={!winner}
                    data-testid="button-next-step-1"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {finishStep === 2 && (
                <div className="space-y-3 pt-2" data-testid="finish-step-2">
                  <div className="text-center space-y-1">
                    <Badge variant="default" className="gap-1">
                      <Trophy className="w-3 h-3" /> Winner
                    </Badge>
                    <p className="font-semibold">{getWinnerLabel()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-center">Enter winning team's score</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder=""
                      value={winnerScore}
                      onChange={(e) => setWinnerScore(e.target.value)}
                      className="text-2xl text-center font-bold h-14"
                      data-testid="input-winner-score"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setFinishStep(3)}
                    disabled={winnerScore === "" || isNaN(Number(winnerScore)) || Number(winnerScore) < 0}
                    data-testid="button-next-step-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {finishStep === 3 && (
                <div className="space-y-3 pt-2" data-testid="finish-step-3">
                  <div className="text-center space-y-1">
                    <Badge variant="outline" className="gap-1 text-muted-foreground">Losing team</Badge>
                    <p className="font-semibold">{getLoserLabel()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-center">Enter losing team's score</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder=""
                      value={loserScore}
                      onChange={(e) => setLoserScore(e.target.value)}
                      className="text-2xl text-center font-bold h-14"
                      data-testid="input-loser-score"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setFinishStep(4)}
                    disabled={loserScore === "" || isNaN(Number(loserScore)) || Number(loserScore) < 0}
                    data-testid="button-next-step-3"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {finishStep === 4 && (
                <div className="space-y-4 pt-2" data-testid="finish-step-4">
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="font-semibold truncate">{getWinnerLabel()}</span>
                      </div>
                      <span className="text-2xl font-bold font-mono text-primary">{winnerScore}</span>
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground truncate block">{getLoserLabel()}</span>
                      </div>
                      <span className="text-2xl font-bold font-mono text-muted-foreground">{loserScore}</span>
                    </div>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Do you agree with these scores?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={resetFinishFlow}
                      className="gap-2"
                      data-testid="button-amend-scores"
                    >
                      <RotateCcw className="w-4 h-4" /> Amend Scores
                    </Button>
                    <Button
                      onClick={handleFinalConfirm}
                      disabled={isSubmitting}
                      className="gap-2"
                      data-testid="button-confirm-finish"
                    >
                      <Check className="w-4 h-4" /> {isSubmitting ? "Saving..." : "Confirm & Finish"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
