import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Check, GripVertical, ArrowRight, Users, Pencil, Trash2, Clock, X, Shuffle, Trophy, RotateCcw, CheckCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { CourtMatch } from "./BadmintonCourt";
import { useEditMatchScore, usePlayerEnterScore, useDeleteMatch, useDeleteQueuedMatch, useReshuffleMatch, useUpdateMatchTarget } from "@/hooks/use-matches";
import { format } from "date-fns";

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
  activeMode?: string;
  genderType?: string;
  defaultPointsToPlayTo?: number;
  autoGenerateActive?: boolean;
  onStopAutoGenerate?: () => void;
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

function EditableTarget({
  matchId,
  value,
  isOrganiser,
  onUpdate,
}: {
  matchId: number;
  value: number;
  isOrganiser: boolean;
  onUpdate: (params: { matchId: number; pointsToPlayTo: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const num = parseInt(draft, 10);
    if (!isNaN(num) && num >= 1) {
      if (num !== value) {
        onUpdate({ matchId, pointsToPlayTo: num });
      }
    } else {
      setDraft(String(value));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="1"
        className="w-14 border rounded px-1.5 py-0.5 text-xs bg-background text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        data-testid={`input-queue-target-${matchId}`}
      />
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-xs", isOrganiser && "cursor-pointer")}
      onClick={() => isOrganiser && setEditing(true)}
      data-testid={`badge-queue-target-${matchId}`}
    >
      Play to {value}
    </Badge>
  );
}

export function MatchQueue({
  matches,
  availablePlayers,
  isOrganiser,
  onSwapPlayer,
  onAssignToCourt,
  availableCourts,
  activeMode,
  genderType,
  defaultPointsToPlayTo = 21,
  autoGenerateActive,
  onStopAutoGenerate,
}: MatchQueueProps) {
  const { mutate: deleteQueuedMatch, isPending: isDeleting } = useDeleteQueuedMatch();
  const { mutate: reshuffleMatch, isPending: isReshuffling } = useReshuffleMatch();
  const { mutate: updateTarget } = useUpdateMatchTarget();
  const [deleteConfirm, setDeleteConfirm] = useState<CourtMatch | null>(null);

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
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <GripVertical className="w-5 h-5" />
              Match Queue ({queuedMatches.length} pending)
            </CardTitle>
            {autoGenerateActive && isOrganiser && onStopAutoGenerate && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onStopAutoGenerate}
                data-testid="button-stop-auto-generate-queue"
              >
                <X className="w-4 h-4 mr-1" />
                Stop Generating
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 p-4">
              {queuedMatches.map((match, index) => {
                const matchTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
                return (
                  <div
                    key={match.id}
                    className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50"
                    data-testid={`queue-match-${match.id}`}
                  >
                    {/* --- MOBILE LAYOUT (< sm) --- */}
                    <div className="sm:hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Match {index + 1}</span>
                      </div>

                      <div className="flex items-center justify-center gap-2 mb-1.5">
                        <PlayerBadge
                          player={match.teamAPlayer1}
                          position="teamAPlayer1Id"
                          matchId={match.id}
                          availablePlayers={availablePlayers}
                          isOrganiser={isOrganiser}
                          onSwap={onSwapPlayer}
                        />
                        {match.teamAPlayer2 && (
                          <PlayerBadge
                            player={match.teamAPlayer2}
                            position="teamAPlayer2Id"
                            matchId={match.id}
                            availablePlayers={availablePlayers}
                            isOrganiser={isOrganiser}
                            onSwap={onSwapPlayer}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-center my-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">VS</span>
                      </div>

                      <div className="flex items-center justify-center gap-2 mt-1.5">
                        <PlayerBadge
                          player={match.teamBPlayer1}
                          position="teamBPlayer1Id"
                          matchId={match.id}
                          availablePlayers={availablePlayers}
                          isOrganiser={isOrganiser}
                          onSwap={onSwapPlayer}
                        />
                        {match.teamBPlayer2 && (
                          <PlayerBadge
                            player={match.teamBPlayer2}
                            position="teamBPlayer2Id"
                            matchId={match.id}
                            availablePlayers={availablePlayers}
                            isOrganiser={isOrganiser}
                            onSwap={onSwapPlayer}
                          />
                        )}
                      </div>

                      {isOrganiser && availableCourts.length > 0 && (
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                          {availableCourts.slice(0, 2).map(court => (
                            <Button
                              key={court}
                              size="sm"
                              variant="outline"
                              onClick={() => onAssignToCourt(match.id, court)}
                              className="gap-1 text-xs"
                              data-testid={`button-assign-${match.id}-court-${court}`}
                            >
                              <ArrowRight className="w-3 h-3" />
                              Court {court}
                            </Button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                        <div className="flex items-center gap-2 flex-wrap">
                          <EditableTarget
                            matchId={match.id}
                            value={matchTarget}
                            isOrganiser={isOrganiser}
                            onUpdate={updateTarget}
                          />
                          {match.numberOfSets && match.numberOfSets > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {match.numberOfSets === 3 ? "Best of 3" : "2 Sets"}
                            </Badge>
                          )}
                        </div>
                        {isOrganiser && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => reshuffleMatch({ matchId: match.id, mode: activeMode, genderType })}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-${match.id}`}
                              title="Reshuffle players"
                            >
                              <Shuffle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(match)}
                              data-testid={`button-delete-queued-${match.id}`}
                              title="Remove match"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* --- DESKTOP/TABLET LAYOUT (>= sm) --- */}
                    <div className="hidden sm:flex items-start gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 mt-1">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <EditableTarget
                            matchId={match.id}
                            value={matchTarget}
                            isOrganiser={isOrganiser}
                            onUpdate={updateTarget}
                          />
                          {match.numberOfSets && match.numberOfSets > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {match.numberOfSets === 3 ? "Best of 3" : "2 Sets"}
                            </Badge>
                          )}
                        </div>
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
                        <div className="flex items-center gap-1 text-muted-foreground text-xs my-1">
                          <span>vs</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
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

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isOrganiser && availableCourts.length > 0 && (
                          <div className="flex items-center gap-1">
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
                        {isOrganiser && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => reshuffleMatch({ matchId: match.id, mode: activeMode, genderType })}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-${match.id}`}
                              title="Reshuffle players"
                            >
                              <Shuffle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(match)}
                              data-testid={`button-delete-queued-${match.id}`}
                              title="Remove match"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Queued Match</DialogTitle>
            <DialogDescription>
              This match will be removed and a replacement will be automatically generated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete-queued">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirm) {
                  deleteQueuedMatch({ matchId: deleteConfirm.id, mode: activeMode, genderType }, {
                    onSuccess: () => setDeleteConfirm(null),
                  });
                }
              }} 
              disabled={isDeleting} 
              data-testid="button-confirm-delete-queued"
            >
              {isDeleting ? "Removing..." : "Remove & Replace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CompletedMatches({ matches, isOrganiser = false, isSignedUp = false }: { matches: CourtMatch[]; isOrganiser?: boolean; isSignedUp?: boolean }) {
  const [scoreMatch, setScoreMatch] = useState<CourtMatch | null>(null);
  const [scoreMode, setScoreMode] = useState<"edit" | "player">("edit");
  const [finishStep, setFinishStep] = useState<1 | 2 | 3 | 4>(1);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const [winnerScore, setWinnerScore] = useState<string>("");
  const [loserScore, setLoserScore] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteMatch, setDeleteMatch] = useState<CourtMatch | null>(null);
  const [editSetScores, setEditSetScores] = useState<{ scoreA: string; scoreB: string }[]>([]);
  const [editSelectedSet, setEditSelectedSet] = useState<number | null>(null);
  const [editSetScoreA, setEditSetScoreA] = useState("");
  const [editSetScoreB, setEditSetScoreB] = useState("");
  const { mutate: editScore, isPending: isEditPending } = useEditMatchScore();
  const { mutate: enterPlayerScore, isPending: isPlayerScorePending } = usePlayerEnterScore();
  const { mutate: removeMatch, isPending: isDeletePending } = useDeleteMatch();

  const completedMatches = matches
    .filter(m => m.status === "COMPLETED")
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  if (completedMatches.length === 0) return null;

  const isMultiSet = (match: CourtMatch | null) => {
    if (!match) return false;
    return (match.numberOfSets || 1) > 1;
  };

  const openScoreDialog = (match: CourtMatch, mode: "edit" | "player") => {
    setScoreMatch(match);
    setScoreMode(mode);
    setShowSuccess(false);
    setEditSelectedSet(null);
    setEditSetScoreA("");
    setEditSetScoreB("");

    if (mode === "edit" && isMultiSet(match)) {
      const existing = (match.setScores as { scoreA: number; scoreB: number }[]) || [];
      const totalSets = match.numberOfSets || 1;
      const scores: { scoreA: string; scoreB: string }[] = [];
      for (let i = 0; i < totalSets; i++) {
        if (i < existing.length) {
          scores.push({ scoreA: String(existing[i].scoreA), scoreB: String(existing[i].scoreB) });
        } else {
          scores.push({ scoreA: "", scoreB: "" });
        }
      }
      setEditSetScores(scores);
      setFinishStep(1);
    } else {
      setFinishStep(1);
      setWinner(null);
      setWinnerScore("");
      setLoserScore("");
    }
  };

  const resetFinishFlow = () => {
    setFinishStep(1);
    setWinner(null);
    setWinnerScore("");
    setLoserScore("");
  };

  const getTeamALabel = (m: CourtMatch) =>
    m.teamAPlayer2 ? `${m.teamAPlayer1.user.fullName} & ${m.teamAPlayer2.user.fullName}` : m.teamAPlayer1.user.fullName;

  const getTeamBLabel = (m: CourtMatch) =>
    m.teamBPlayer2 ? `${m.teamBPlayer1.user.fullName} & ${m.teamBPlayer2.user.fullName}` : m.teamBPlayer1.user.fullName;

  const getWinnerLabel = () => scoreMatch ? (winner === "A" ? getTeamALabel(scoreMatch) : getTeamBLabel(scoreMatch)) : "";
  const getLoserLabel = () => scoreMatch ? (winner === "A" ? getTeamBLabel(scoreMatch) : getTeamALabel(scoreMatch)) : "";

  const handleSetScoreSave = () => {
    if (editSelectedSet === null || editSetScoreA === "" || editSetScoreB === "") return;
    const updated = [...editSetScores];
    updated[editSelectedSet] = { scoreA: editSetScoreA, scoreB: editSetScoreB };
    setEditSetScores(updated);
    setEditSelectedSet(null);
    setEditSetScoreA("");
    setEditSetScoreB("");
  };

  const handleFinalConfirm = () => {
    if (!scoreMatch) return;

    if (scoreMode === "edit" && isMultiSet(scoreMatch)) {
      const validSets = editSetScores.filter(s => s.scoreA !== "" && s.scoreB !== "");
      if (validSets.length === 0) return;
      const parsedSets = validSets.map(s => ({ scoreA: Number(s.scoreA), scoreB: Number(s.scoreB) }));
      let totalA = 0, totalB = 0;
      for (const s of parsedSets) { totalA += s.scoreA; totalB += s.scoreB; }
      editScore({ matchId: scoreMatch.id, scoreA: totalA, scoreB: totalB, setScores: parsedSets }, {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => { setScoreMatch(null); setShowSuccess(false); }, 2000);
        }
      });
      return;
    }

    if (!winner || !winnerScore || !loserScore) return;
    const wScore = Number(winnerScore);
    const lScore = Number(loserScore);
    const sA = winner === "A" ? wScore : lScore;
    const sB = winner === "B" ? wScore : lScore;
    const mutate = scoreMode === "edit" ? editScore : enterPlayerScore;
    mutate({ matchId: scoreMatch.id, scoreA: sA, scoreB: sB }, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => { setScoreMatch(null); setShowSuccess(false); }, 2000);
      }
    });
  };

  const handleDeleteMatch = () => {
    if (deleteMatch) {
      removeMatch({ matchId: deleteMatch.id }, {
        onSuccess: () => setDeleteMatch(null)
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
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-4">
              {completedMatches.map((match) => {
                const hasScore = (match.scoreA || 0) > 0 || (match.scoreB || 0) > 0;
                const scoreAlreadyEntered = !!match.scoreEnteredByUserId;
                const canPlayerEnterScore = isSignedUp && !scoreAlreadyEntered && !hasScore;

                return (
                  <div
                    key={match.id}
                    className="p-3 bg-muted/20 rounded-lg space-y-2"
                    data-testid={`completed-match-${match.id}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        <div className="flex items-center gap-1.5">
                          <Badge variant={(match.scoreA || 0) > (match.scoreB || 0) ? "default" : "secondary"} className="font-mono">
                            {match.scoreA} - {match.scoreB}
                          </Badge>
                          {match.setScores && match.setScores.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono" data-testid={`text-set-scores-${match.id}`}>
                              ({match.setScores.map((s: any, i: number) => `${s.scoreA}-${s.scoreB}`).join(", ")})
                            </span>
                          )}
                        </div>
                        {canPlayerEnterScore && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openScoreDialog(match, "player")}
                            data-testid={`button-enter-score-${match.id}`}
                          >
                            Enter Score
                          </Button>
                        )}
                        {isOrganiser && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openScoreDialog(match, "edit")}
                              data-testid={`button-edit-match-${match.id}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setDeleteMatch(match)}
                              data-testid={`button-delete-match-${match.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {(match.scoreEnteredByUser || match.scoreUpdatedByUser) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {match.scoreUpdatedByUser ? (
                          <span data-testid={`text-score-audit-${match.id}`}>
                            Score amended by {match.scoreUpdatedByUser.fullName}
                            {match.scoreUpdatedAt && ` at ${format(new Date(match.scoreUpdatedAt), "dd MMM HH:mm")}`}
                          </span>
                        ) : match.scoreEnteredByUser ? (
                          <span data-testid={`text-score-audit-${match.id}`}>
                            Score entered by {match.scoreEnteredByUser.fullName}
                            {match.scoreEnteredAt && ` at ${format(new Date(match.scoreEnteredAt), "dd MMM HH:mm")}`}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!scoreMatch} onOpenChange={(open) => { if (!open) { setScoreMatch(null); resetFinishFlow(); setShowSuccess(false); setEditSelectedSet(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showSuccess
                ? "Score Saved"
                : scoreMatch && scoreMode === "edit" && isMultiSet(scoreMatch)
                ? (editSelectedSet !== null ? `Edit Set ${editSelectedSet + 1}` : "Edit Set Scores")
                : finishStep === 1
                ? "Who won the match?"
                : finishStep === 2
                ? "Winning team score"
                : finishStep === 3
                ? "Losing team score"
                : "Confirm match result"}
            </DialogTitle>
            {!showSuccess && scoreMode === "edit" && !(scoreMatch && isMultiSet(scoreMatch)) && finishStep === 1 && (
              <DialogDescription>Amend the score for this match. This action is logged.</DialogDescription>
            )}
            {!showSuccess && scoreMode === "edit" && scoreMatch && isMultiSet(scoreMatch) && (
              <DialogDescription>Select a set to amend its score</DialogDescription>
            )}
            {!showSuccess && scoreMode === "player" && finishStep === 1 && (
              <DialogDescription>You can enter the score once. If there is a dispute, contact an admin.</DialogDescription>
            )}
          </DialogHeader>

          {showSuccess ? (
            <div className="py-8 text-center space-y-3" data-testid="score-edit-success">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Thank you. Match results have been saved.</p>
            </div>
          ) : scoreMatch && scoreMode === "edit" && isMultiSet(scoreMatch) ? (
            editSelectedSet !== null ? (
              <div className="space-y-4 py-4">
                <div className="text-center text-sm text-muted-foreground mb-2">
                  Enter scores for Set {editSelectedSet + 1}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 text-sm truncate">{getTeamALabel(scoreMatch)}</label>
                    <Input type="number" min="0" max="99" value={editSetScoreA} onChange={(e) => setEditSetScoreA(e.target.value)} placeholder="Score" className="w-24 text-center text-lg" data-testid="edit-input-set-score-a" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 text-sm truncate">{getTeamBLabel(scoreMatch)}</label>
                    <Input type="number" min="0" max="99" value={editSetScoreB} onChange={(e) => setEditSetScoreB(e.target.value)} placeholder="Score" className="w-24 text-center text-lg" data-testid="edit-input-set-score-b" />
                  </div>
                </div>
                {editSetScoreA !== "" && editSetScoreB !== "" && editSetScoreA === editSetScoreB && (
                  <p className="text-sm text-destructive text-center">Scores cannot be tied</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => { setEditSelectedSet(null); setEditSetScoreA(""); setEditSetScoreB(""); }} data-testid="edit-button-back-sets">
                    <RotateCcw className="w-4 h-4" /> Back
                  </Button>
                  <Button className="flex-1 gap-2" disabled={editSetScoreA === "" || editSetScoreB === "" || editSetScoreA === editSetScoreB} onClick={handleSetScoreSave} data-testid="edit-button-save-set">
                    <CheckCircle className="w-4 h-4" /> Save Set
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="text-xs text-muted-foreground text-center mb-1">
                  {getTeamALabel(scoreMatch)} vs {getTeamBLabel(scoreMatch)}
                </div>
                <div className="space-y-2">
                  {editSetScores.map((s, i) => {
                    const hasScore = s.scoreA !== "" && s.scoreB !== "";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-md px-3 py-3 bg-muted/30 cursor-pointer hover-elevate"
                        onClick={() => {
                          setEditSelectedSet(i);
                          setEditSetScoreA(s.scoreA);
                          setEditSetScoreB(s.scoreB);
                        }}
                        data-testid={`edit-set-row-${i}`}
                      >
                        <Badge variant="secondary" className="text-xs">Set {i + 1}</Badge>
                        <div className="flex-1 text-center">
                          {hasScore ? (
                            <span className="font-mono font-semibold">{s.scoreA} - {s.scoreB}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </div>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const validSets = editSetScores.filter(s => s.scoreA !== "" && s.scoreB !== "");
                  let totalA = 0, totalB = 0, setsWonA = 0, setsWonB = 0;
                  for (const s of validSets) {
                    totalA += Number(s.scoreA); totalB += Number(s.scoreB);
                    if (Number(s.scoreA) > Number(s.scoreB)) setsWonA++;
                    else if (Number(s.scoreB) > Number(s.scoreA)) setsWonB++;
                  }
                  return validSets.length > 0 ? (
                    <div className="bg-muted/50 rounded-md p-3 text-center space-y-1">
                      <div className="text-xs text-muted-foreground">Total Score</div>
                      <div className="text-xl font-bold">{totalA} - {totalB}</div>
                      <div className="text-xs text-muted-foreground">Sets won: {setsWonA} - {setsWonB}</div>
                    </div>
                  ) : null;
                })()}
                <Button
                  className="w-full gap-2"
                  disabled={isEditPending || editSetScores.filter(s => s.scoreA !== "" && s.scoreB !== "").length === 0}
                  onClick={handleFinalConfirm}
                  data-testid="edit-button-save-all"
                >
                  {isEditPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save All Scores
                </Button>
              </div>
            )
          ) : scoreMatch && (
            <>
              <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "w-8 h-1.5 rounded-full transition-colors",
                      s <= finishStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {finishStep === 1 && (
                <div className="space-y-3 pt-2" data-testid="score-edit-step-1">
                  <p className="text-sm text-muted-foreground text-center">Select the winning team</p>
                  <div className="space-y-2">
                    <Button
                      variant={winner === "A" ? "default" : "outline"}
                      className="w-full justify-start gap-3 py-6"
                      onClick={() => setWinner("A")}
                      data-testid="button-select-winner-a"
                    >
                      <Trophy className={cn("w-5 h-5", winner === "A" ? "text-yellow-300" : "text-muted-foreground")} />
                      <span className="text-left flex-1 truncate">{getTeamALabel(scoreMatch)}</span>
                      {winner === "A" && <Check className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant={winner === "B" ? "default" : "outline"}
                      className="w-full justify-start gap-3 py-6"
                      onClick={() => setWinner("B")}
                      data-testid="button-select-winner-b"
                    >
                      <Trophy className={cn("w-5 h-5", winner === "B" ? "text-yellow-300" : "text-muted-foreground")} />
                      <span className="text-left flex-1 truncate">{getTeamBLabel(scoreMatch)}</span>
                      {winner === "B" && <Check className="w-5 h-5" />}
                    </Button>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setFinishStep(2)}
                    disabled={!winner}
                    data-testid="button-score-next-1"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {finishStep === 2 && (
                <div className="space-y-3 pt-2" data-testid="score-edit-step-2">
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
                      data-testid="input-edit-winner-score"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setFinishStep(3)}
                    disabled={winnerScore === "" || isNaN(Number(winnerScore)) || Number(winnerScore) < 0}
                    data-testid="button-score-next-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {finishStep === 3 && (
                <div className="space-y-3 pt-2" data-testid="score-edit-step-3">
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
                      data-testid="input-edit-loser-score"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setFinishStep(4)}
                    disabled={loserScore === "" || isNaN(Number(loserScore)) || Number(loserScore) < 0}
                    data-testid="button-score-next-3"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {finishStep === 4 && (
                <div className="space-y-4 pt-2" data-testid="score-edit-step-4">
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
                      data-testid="button-score-amend"
                    >
                      <RotateCcw className="w-4 h-4" /> Amend Scores
                    </Button>
                    <Button
                      onClick={handleFinalConfirm}
                      disabled={isEditPending || isPlayerScorePending}
                      className="gap-2"
                      data-testid="button-score-confirm"
                    >
                      <Check className="w-4 h-4" /> {isEditPending || isPlayerScorePending ? "Saving..." : "Confirm & Finish"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteMatch} onOpenChange={(open) => !open && setDeleteMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Match</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this completed match? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMatch(null)} data-testid="button-cancel-delete-match">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMatch} disabled={isDeletePending} data-testid="button-confirm-delete-match">
              {isDeletePending ? "Deleting..." : "Delete Match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
