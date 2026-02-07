import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Check, GripVertical, ArrowRight, Users, Pencil, Trash2, Clock, X, Shuffle } from "lucide-react";
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
          <CardTitle className="text-lg flex items-center gap-2">
            <GripVertical className="w-5 h-5" />
            Match Queue ({queuedMatches.length} pending)
          </CardTitle>
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
                        <EditableTarget
                          matchId={match.id}
                          value={matchTarget}
                          isOrganiser={isOrganiser}
                          onUpdate={updateTarget}
                        />
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
  const [editMatch, setEditMatch] = useState<CourtMatch | null>(null);
  const [playerScoreMatch, setPlayerScoreMatch] = useState<CourtMatch | null>(null);
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);
  const [deleteMatch, setDeleteMatch] = useState<CourtMatch | null>(null);
  const { mutate: editScore, isPending: isEditPending } = useEditMatchScore();
  const { mutate: enterPlayerScore, isPending: isPlayerScorePending } = usePlayerEnterScore();
  const { mutate: removeMatch, isPending: isDeletePending } = useDeleteMatch();

  const completedMatches = matches
    .filter(m => m.status === "COMPLETED")
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  if (completedMatches.length === 0) return null;

  const openEditDialog = (match: CourtMatch) => {
    setEditMatch(match);
    setEditScoreA(match.scoreA || 0);
    setEditScoreB(match.scoreB || 0);
  };

  const openPlayerScoreDialog = (match: CourtMatch) => {
    setPlayerScoreMatch(match);
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

  const handlePlayerScore = () => {
    if (playerScoreMatch) {
      enterPlayerScore({ matchId: playerScoreMatch.id, scoreA: editScoreA, scoreB: editScoreB }, {
        onSuccess: () => setPlayerScoreMatch(null)
      });
    }
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
                        <Badge variant={(match.scoreA || 0) > (match.scoreB || 0) ? "default" : "secondary"} className="font-mono">
                          {match.scoreA} - {match.scoreB}
                        </Badge>
                        {canPlayerEnterScore && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openPlayerScoreDialog(match)}
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
                              onClick={() => openEditDialog(match)}
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

      <Dialog open={!!editMatch} onOpenChange={(open) => !open && setEditMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match Score (Admin)</DialogTitle>
            <DialogDescription>Amend the score for this match. This action is logged.</DialogDescription>
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
              <Button className="w-full" onClick={handleSaveScore} disabled={isEditPending} data-testid="button-save-edit-score">
                {isEditPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!playerScoreMatch} onOpenChange={(open) => !open && setPlayerScoreMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Match Score</DialogTitle>
            <DialogDescription>You can enter the score once. If there is a dispute, contact an admin to amend.</DialogDescription>
          </DialogHeader>
          {playerScoreMatch && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {playerScoreMatch.teamAPlayer1.user.fullName}
                    {playerScoreMatch.teamAPlayer2 && ` & ${playerScoreMatch.teamAPlayer2.user.fullName}`}
                  </label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="30"
                    value={editScoreA} 
                    onChange={(e) => setEditScoreA(Number(e.target.value))}
                    className="text-2xl text-center font-bold h-14"
                    data-testid="input-player-score-a"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {playerScoreMatch.teamBPlayer1.user.fullName}
                    {playerScoreMatch.teamBPlayer2 && ` & ${playerScoreMatch.teamBPlayer2.user.fullName}`}
                  </label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="30"
                    value={editScoreB} 
                    onChange={(e) => setEditScoreB(Number(e.target.value))}
                    className="text-2xl text-center font-bold h-14"
                    data-testid="input-player-score-b"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handlePlayerScore} disabled={isPlayerScorePending} data-testid="button-confirm-player-score">
                {isPlayerScorePending ? "Saving..." : "Submit Score"}
              </Button>
            </div>
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
