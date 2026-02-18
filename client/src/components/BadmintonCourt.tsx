import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  currentPlayerProfileId?: number | null;
  onStartMatch: (matchId: number, courtNumber: number) => void;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onSwapPlayer: (matchId: number, position: string, newPlayerId: number) => void;
  onCancelMatch?: (matchId: number) => void;
  onCourtNameChange?: (courtNumber: number, name: string) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
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
        <div className="font-semibold text-xs sm:text-sm truncate">{player.user?.fullName || (player as any)?.fullName || "Unknown"}</div>
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
  currentPlayerProfileId,
  onStartMatch,
  onCompleteMatch,
  onEndSet,
  onSwapPlayer,
  onCancelMatch,
  onCourtNameChange,
  onUpdatePointsTarget,
  onUpdateSets,
  defaultPointsToPlayTo = 21,
}: BadmintonCourtProps) {
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [teamScoreA, setTeamScoreA] = useState<string>("");
  const [teamScoreB, setTeamScoreB] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [setScoreA, setSetScoreA] = useState<string>("");
  const [setScoreB, setSetScoreB] = useState<string>("");
  const [multiSetStep, setMultiSetStep] = useState<"enter" | "confirm">("enter");
  const [singleSetStep, setSingleSetStep] = useState<"enter" | "confirm">("enter");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(courtName || `Court ${courtNumber}`);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const target = match?.pointsToPlayTo || defaultPointsToPlayTo;

  const isPlayerInMatch = currentPlayerProfileId && match ? (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  ) : false;

  const canEndMatch = isOrganiser || isPlayerInMatch || isSignedUp;

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

  const [dialogTarget, setDialogTarget] = useState<number>(target);

  useEffect(() => {
    setDialogTarget(target);
  }, [target]);

  const openFinishDialog = () => {
    setTeamScoreA("");
    setTeamScoreB("");
    setSetScoreA("");
    setSetScoreB("");
    setMultiSetStep("enter");
    setSingleSetStep("enter");
    setShowSuccess(false);
    setDialogTarget(target);
    setShowScoreDialog(true);
  };

  const handleDialogTargetChange = (newTarget: number) => {
    setDialogTarget(newTarget);
    if (match && onUpdatePointsTarget) {
      onUpdatePointsTarget(match.id, newTarget);
    }
  };

  const resetFinishFlow = () => {
    setTeamScoreA("");
    setTeamScoreB("");
    setSetScoreA("");
    setSetScoreB("");
    setMultiSetStep("enter");
    setSingleSetStep("enter");
  };

  const getTeamALabel = () => {
    if (!match) return "Team A";
    const p1 = match.teamAPlayer1?.user?.fullName || (match.teamAPlayer1 as any)?.fullName || "Player";
    const p2 = match.teamAPlayer2 ? (match.teamAPlayer2?.user?.fullName || (match.teamAPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };

  const getTeamBLabel = () => {
    if (!match) return "Team B";
    const p1 = match.teamBPlayer1?.user?.fullName || (match.teamBPlayer1 as any)?.fullName || "Player";
    const p2 = match.teamBPlayer2 ? (match.teamBPlayer2?.user?.fullName || (match.teamBPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalConfirm = async () => {
    if (!match) return;
    const sA = Number(teamScoreA);
    const sB = Number(teamScoreB);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0 || sA === sB) return;
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
          {match && isOrganiser && (
            <Select
              value={String(matchSets)}
              onValueChange={(v) => {
                const val = Number(v);
                if (match && onUpdateSets) onUpdateSets(match.id, val);
              }}
            >
              <SelectTrigger className="h-6 w-auto min-w-0 gap-1 px-2 text-xs" data-testid={`select-sets-${match.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" data-testid="select-sets-1">1 Set</SelectItem>
                <SelectItem value="2" data-testid="select-sets-2">2 Sets</SelectItem>
                <SelectItem value="3" data-testid="select-sets-3">Best of 3</SelectItem>
              </SelectContent>
            </Select>
          )}
          {!isOrganiser && isMultiSet && match && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-sets-${match.id}`}>
              {matchSets === 3 ? "Best of 3" : `${matchSets} Sets`}
            </Badge>
          )}
          {isMultiSet && match?.status === "LIVE" && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-set-progress-${match.id}`}>
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

            {(isOrganiser || canEndMatch) && (
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
                {match.status === "LIVE" && canEndMatch && (
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
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="secondary">Completed</Badge>
                    {(match.scoreEnteredByUser || match.scoreUpdatedByUser) && (
                      <span className="text-[10px] text-muted-foreground" data-testid={`text-score-entered-by-${match.id}`}>
                        {match.scoreUpdatedByUser
                          ? `Score amended by ${match.scoreUpdatedByUser.fullName}`
                          : `Score entered by ${match.scoreEnteredByUser!.fullName}`}
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center justify-center gap-2 py-1" data-testid="set-target-selector">
                    <span className="text-sm text-muted-foreground">Play to</span>
                    <Input
                      type="number"
                      min="1"
                      value={String(dialogTarget)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val) && val > 0) handleDialogTargetChange(val);
                      }}
                      className="w-20 h-8 text-sm text-center"
                      data-testid="input-dialog-target"
                    />
                  </div>

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
                      <p className="text-sm text-center text-muted-foreground">
                        {currentSetNum >= matchSets ? "This will end the match and submit the final score." : `Confirm set ${currentSetNum} scores?`}
                      </p>
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
                          <Check className="w-4 h-4" /> {isSubmitting ? "Saving..." : currentSetNum >= matchSets ? "End Match & Submit" : "Confirm"}
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
                  {showSuccess
                    ? "Match Saved"
                    : singleSetStep === "enter"
                      ? "Enter Match Score"
                      : "Confirm & End Match"}
                </DialogTitle>
                <DialogDescription className="sr-only">Enter the final match scores</DialogDescription>
              </DialogHeader>

              {showSuccess ? (
                <div className="py-8 text-center space-y-3" data-testid="finish-success">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <p className="text-lg font-medium">Thank you. Match results have been saved.</p>
                </div>
              ) : (
                <>
                  {singleSetStep === "enter" && (
                    <div className="space-y-4 pt-2" data-testid="finish-score-entry">
                      <div className="flex items-center justify-center gap-2 py-1" data-testid="single-set-target-selector">
                        <span className="text-sm text-muted-foreground">Play to</span>
                        <Input
                          type="number"
                          min="1"
                          value={String(dialogTarget)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val) && val > 0) handleDialogTargetChange(val);
                          }}
                          className="w-20 h-8 text-sm text-center"
                          data-testid="input-dialog-target-single"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-medium truncate" data-testid="text-team-a-label">{getTeamALabel()}</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={teamScoreA}
                            onChange={(e) => setTeamScoreA(e.target.value)}
                            className="w-24 text-center text-lg font-bold"
                            data-testid="input-score-a"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-medium truncate" data-testid="text-team-b-label">{getTeamBLabel()}</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={teamScoreB}
                            onChange={(e) => setTeamScoreB(e.target.value)}
                            className="w-24 text-center text-lg font-bold"
                            data-testid="input-score-b"
                          />
                        </div>
                      </div>

                      {teamScoreA !== "" && teamScoreB !== "" && teamScoreA === teamScoreB && (
                        <p className="text-sm text-destructive text-center">Scores cannot be tied</p>
                      )}

                      <Button
                        className="w-full gap-2"
                        onClick={() => setSingleSetStep("confirm")}
                        disabled={
                          teamScoreA === "" || teamScoreB === "" ||
                          isNaN(Number(teamScoreA)) || isNaN(Number(teamScoreB)) ||
                          Number(teamScoreA) < 0 || Number(teamScoreB) < 0 ||
                          Number(teamScoreA) === Number(teamScoreB)
                        }
                        data-testid="button-next-scores"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {singleSetStep === "confirm" && (
                    <div className="space-y-4 pt-2" data-testid="finish-score-confirm">
                      <div className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {Number(teamScoreA) > Number(teamScoreB) && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                            <span className={cn("truncate", Number(teamScoreA) > Number(teamScoreB) ? "font-semibold" : "text-muted-foreground")}>{getTeamALabel()}</span>
                          </div>
                          <span className={cn("text-2xl font-bold font-mono", Number(teamScoreA) > Number(teamScoreB) ? "text-primary" : "text-muted-foreground")}>{teamScoreA}</span>
                        </div>
                        <div className="border-t border-border" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {Number(teamScoreB) > Number(teamScoreA) && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                            <span className={cn("truncate", Number(teamScoreB) > Number(teamScoreA) ? "font-semibold" : "text-muted-foreground")}>{getTeamBLabel()}</span>
                          </div>
                          <span className={cn("text-2xl font-bold font-mono", Number(teamScoreB) > Number(teamScoreA) ? "text-primary" : "text-muted-foreground")}>{teamScoreB}</span>
                        </div>
                      </div>
                      <p className="text-sm text-center text-muted-foreground">This will end the match and submit the final score.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setSingleSetStep("enter")}
                          className="gap-2"
                          data-testid="button-amend-scores"
                        >
                          <RotateCcw className="w-4 h-4" /> Amend
                        </Button>
                        <Button
                          onClick={handleFinalConfirm}
                          disabled={isSubmitting}
                          className="gap-2"
                          data-testid="button-confirm-finish"
                        >
                          <Check className="w-4 h-4" /> {isSubmitting ? "Saving..." : "End Match & Submit"}
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
