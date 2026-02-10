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

export type SetScore = {
  setNumber: number;
  scoreA: number;
  scoreB: number;
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
  numberOfSets?: number | null;
  currentSet?: number | null;
  setsWonA?: number | null;
  setsWonB?: number | null;
  setScores?: SetScore[] | null;
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
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onSwapPlayer: (matchId: number, position: string, newPlayerId: number) => void;
  onCancelMatch?: (matchId: number) => void;
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
          "px-2 sm:px-3 py-1.5 sm:py-2 bg-background rounded-lg border border-border/50 text-center transition-all min-w-0",
          isOrganiser && "cursor-pointer hover:border-primary hover:bg-primary/5"
        )}
        data-testid={`player-slot-${position}`}
      >
        <div className="font-semibold text-xs sm:text-sm truncate">{player.user.fullName}</div>
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
  onEndSet,
  onSwapPlayer,
  onCancelMatch,
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
  const [setScoreA, setSetScoreA] = useState<string>("");
  const [setScoreB, setSetScoreB] = useState<string>("");
  const [multiSetStep, setMultiSetStep] = useState<"enter" | "confirm">("enter");
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

  const matchSets = match?.numberOfSets || 1;
  const isMultiSet = matchSets > 1;
  const currentSetNum = match?.currentSet || 1;
  const completedSets = match?.setScores || [];

  const openFinishDialog = () => {
    setFinishStep(1);
    setWinner(null);
    setWinnerScore("");
    setLoserScore("");
    setSetScoreA("");
    setSetScoreB("");
    setMultiSetStep("enter");
    setShowSuccess(false);
    setShowScoreDialog(true);
  };

  const resetFinishFlow = () => {
    setFinishStep(1);
    setWinner(null);
    setWinnerScore("");
    setLoserScore("");
    setSetScoreA("");
    setSetScoreB("");
    setMultiSetStep("enter");
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

  const handleEndSetConfirm = async () => {
    if (!match) return;
    const sA = Number(setScoreA);
    const sB = Number(setScoreB);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0 || sA === sB) return;
    setIsSubmitting(true);
    try {
      const result = onEndSet(match.id, currentSetNum, sA, sB);
      if (result && typeof (result as any).then === "function") {
        await result;
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowScoreDialog(false);
        setShowSuccess(false);
      }, 2000);
    } catch {
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
          {isMultiSet && match?.status === "LIVE" && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-sets-${match.id}`}>
              Set {currentSetNum}/{matchSets} ({match?.setsWonA || 0}-{match?.setsWonB || 0})
            </Badge>
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
                className="p-2 sm:p-4 min-h-[180px] bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${courtImage})` }}
              >
                <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] gap-1 sm:gap-2 h-full items-center">
                  <div className="flex flex-col justify-around items-stretch gap-2 min-w-0">
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

                  <div className="flex items-center justify-center px-1 sm:px-3">
                    <div className="bg-white/90 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 shadow-lg">
                      {match.status === "COMPLETED" ? (
                        <div className="text-center">
                          <div className="text-xl sm:text-2xl font-bold font-mono">
                            <span className="text-primary">{match.scoreA}</span>
                            <span className="text-muted-foreground mx-1 sm:mx-2">-</span>
                            <span className="text-secondary">{match.scoreB}</span>
                          </div>
                          {isMultiSet && completedSets.length > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              {completedSets.map((s, i) => (
                                <span key={i}>{i > 0 && ", "}{s.scoreA}-{s.scoreB}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : match.status === "LIVE" && isMultiSet && completedSets.length > 0 ? (
                        <div className="text-center">
                          <div className="text-xs font-semibold text-muted-foreground mb-0.5">Set {currentSetNum}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {completedSets.map((s, i) => (
                              <span key={i}>{i > 0 && ", "}{s.scoreA}-{s.scoreB}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">VS</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-around items-stretch gap-2 min-w-0">
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
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={openFinishDialog}
                      className="gap-2"
                      data-testid={`button-complete-match-${match.id}`}
                    >
                      <Square className="w-4 h-4" /> {isMultiSet ? `End Set ${currentSetNum}` : "End Match"}
                    </Button>
                    {isOrganiser && onCancelMatch && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onCancelMatch(match.id)}
                        className="text-destructive border-destructive/50"
                        data-testid={`button-cancel-match-${match.id}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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
          {isMultiSet ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {showSuccess
                    ? "Scores Saved"
                    : multiSetStep === "enter"
                      ? `Set ${currentSetNum} of ${matchSets} - Enter Scores`
                      : `Confirm Set ${currentSetNum} Scores`}
                </DialogTitle>
                <DialogDescription className="sr-only">Enter set scores for multi-set match</DialogDescription>
              </DialogHeader>

              {showSuccess ? (
                <div className="py-8 text-center space-y-3" data-testid="finish-success">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <p className="text-lg font-medium">Set {currentSetNum} scores have been saved.</p>
                </div>
              ) : (
                <>
                  {completedSets.length > 0 && (
                    <div className="rounded-lg border border-border p-3 space-y-1" data-testid="previous-sets-summary">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Previous Sets</p>
                      {completedSets.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Set {s.setNumber}</span>
                          <span className="font-mono font-semibold">{s.scoreA} - {s.scoreB}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-1 mt-1 flex items-center justify-between text-sm font-medium">
                        <span>Sets Won</span>
                        <span className="font-mono">{match?.setsWonA || 0} - {match?.setsWonB || 0}</span>
                      </div>
                    </div>
                  )}

                  {multiSetStep === "enter" && (
                    <div className="space-y-4 pt-2" data-testid="multi-set-enter">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-center">
                          <p className="text-sm font-medium truncate">{getTeamALabel()}</p>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={setScoreA}
                            onChange={(e) => setSetScoreA(e.target.value)}
                            className="text-2xl text-center font-bold h-14"
                            data-testid="input-set-score-a"
                          />
                        </div>
                        <div className="space-y-2 text-center">
                          <p className="text-sm font-medium truncate">{getTeamBLabel()}</p>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={setScoreB}
                            onChange={(e) => setSetScoreB(e.target.value)}
                            className="text-2xl text-center font-bold h-14"
                            data-testid="input-set-score-b"
                          />
                        </div>
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={() => setMultiSetStep("confirm")}
                        disabled={
                          setScoreA === "" || setScoreB === "" ||
                          isNaN(Number(setScoreA)) || isNaN(Number(setScoreB)) ||
                          Number(setScoreA) < 0 || Number(setScoreB) < 0 ||
                          (Number(setScoreA) === Number(setScoreB))
                        }
                        data-testid="button-next-set-scores"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {multiSetStep === "confirm" && (
                    <div className="space-y-4 pt-2" data-testid="multi-set-confirm">
                      <div className="rounded-lg border border-border p-4 space-y-3">
                        <div className="text-center text-xs text-muted-foreground mb-1">Set {currentSetNum}</div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {Number(setScoreA) > Number(setScoreB) && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                            <span className={cn("truncate", Number(setScoreA) > Number(setScoreB) ? "font-semibold" : "text-muted-foreground")}>{getTeamALabel()}</span>
                          </div>
                          <span className={cn("text-2xl font-bold font-mono", Number(setScoreA) > Number(setScoreB) ? "text-primary" : "text-muted-foreground")}>{setScoreA}</span>
                        </div>
                        <div className="border-t border-border" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {Number(setScoreB) > Number(setScoreA) && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                            <span className={cn("truncate", Number(setScoreB) > Number(setScoreA) ? "font-semibold" : "text-muted-foreground")}>{getTeamBLabel()}</span>
                          </div>
                          <span className={cn("text-2xl font-bold font-mono", Number(setScoreB) > Number(setScoreA) ? "text-primary" : "text-muted-foreground")}>{setScoreB}</span>
                        </div>
                      </div>
                      <p className="text-sm text-center text-muted-foreground">Confirm set {currentSetNum} scores?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setMultiSetStep("enter")}
                          className="gap-2"
                          data-testid="button-amend-set-scores"
                        >
                          <RotateCcw className="w-4 h-4" /> Amend
                        </Button>
                        <Button
                          onClick={handleEndSetConfirm}
                          disabled={isSubmitting}
                          className="gap-2"
                          data-testid="button-confirm-set"
                        >
                          <Check className="w-4 h-4" /> {isSubmitting ? "Saving..." : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
