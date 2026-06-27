import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, ArrowRight, Users, Pencil, Trash2, Clock, X, Shuffle, RotateCcw, CheckCircle, Loader2, Play, Pause, AlertTriangle, ArrowUp, ArrowDown, MoreHorizontal, Lightbulb, TrendingDown, Check, UserCog, Zap } from "lucide-react";
import { IoFemale, IoMale, IoMaleFemale } from "react-icons/io5";
import { useState, useRef, useEffect, Fragment } from "react";
import { cn } from "@/lib/utils";
import type { CourtMatch } from "./BadmintonCourt";
import { useEditMatchScore, usePlayerEnterScore, useDeleteMatch, useDeleteQueuedMatch, useReshuffleMatch, useUpdateMatchTarget, useCreateEmptyMatch, usePrioritizeLowGames, useReorderQueuedMatches } from "@/hooks/use-matches";
import { format } from "date-fns";
import { PlayerSlotEditable } from "@/components/PlayerSlotEditable";

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
  onGenerateMatch?: () => void;
  isGenerating?: boolean;
  queueTargetSize?: number;
  onQueueTargetSizeChange?: (size: number) => void;
  onClearQueue?: () => void;
  notEnoughPlayersMessage?: string | null;
  sessionId?: number;
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
  achievements?: Record<number, { trophy?: boolean; fire?: boolean }>;
  autoGenerateActive?: boolean;
  onToggleAutoGenerate?: (active: boolean) => void;
};


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
  onGenerateMatch,
  isGenerating,
  queueTargetSize,
  onQueueTargetSizeChange,
  onClearQueue,
  notEnoughPlayersMessage,
  sessionId,
  busyPlayerIds,
  sessionMatchCounts,
  achievements,
  autoGenerateActive,
  onToggleAutoGenerate,
}: MatchQueueProps) {
  const { mutate: deleteQueuedMatch, isPending: isDeleting } = useDeleteQueuedMatch();
  const { mutate: reshuffleMatch, isPending: isReshuffling } = useReshuffleMatch();
  const { mutate: updateTarget } = useUpdateMatchTarget();
  const { mutate: createEmptyMatch, isPending: isCreatingEmpty } = useCreateEmptyMatch();
  const { mutate: prioritizeLowGames, isPending: isPrioritizing } = usePrioritizeLowGames();
  const { mutate: reorderQueue, isPending: isReordering } = useReorderQueuedMatches();
  const [deleteConfirm, setDeleteConfirm] = useState<CourtMatch | null>(null);
  const [reshuffleErrors, setReshuffleErrors] = useState<Record<number, string>>({});
  const [expandedActions, setExpandedActions] = useState<Record<number, boolean>>({});
  const [sectionLight, setSectionLight] = useState(false);

  const computedBusyIds = (() => {
    if (busyPlayerIds && busyPlayerIds.size > 0) return busyPlayerIds;
    const playerMatchCount = new Map<number, number>();
    const liveAndQueued = matches.filter(m => m.status === "LIVE" || m.status === "QUEUED");
    for (const m of liveAndQueued) {
      for (const p of [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2]) {
        if (p?.id) playerMatchCount.set(p.id, (playerMatchCount.get(p.id) || 0) + 1);
      }
    }
    const dupes = new Set<number>();
    for (const [id, count] of playerMatchCount) {
      if (count > 1) dupes.add(id);
    }
    return dupes;
  })();

  const isPlayerBusy = (playerId: number | undefined) => {
    if (!playerId) return false;
    return computedBusyIds.has(playerId);
  };

  const handleFilteredReshuffle = (matchId: number, filterType: string) => {
    setReshuffleErrors(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    reshuffleMatch({ matchId, mode: activeMode, genderType, filterType }, {
      onError: (error: Error) => {
        setReshuffleErrors(prev => ({ ...prev, [matchId]: error.message }));
        setTimeout(() => setReshuffleErrors(prev => { const n = { ...prev }; delete n[matchId]; return n; }), 3000);
      },
    });
  };

  const queuedMatches = matches
    .filter(m => m.status === "QUEUED")
    .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

  const moveQueued = (index: number, dir: -1 | 1) => {
    if (!sessionId) return;
    const target = index + dir;
    if (target < 0 || target >= queuedMatches.length) return;
    const ids = queuedMatches.map(m => m.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderQueue({ sessionId, orderedIds: ids });
  };

  const toggleActions = (matchId: number) => {
    setExpandedActions(prev => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  return (
    <>
      <div className={cn("rounded-xl bg-background/80 dark:bg-[#0D1117] border border-border/50 overflow-hidden", sectionLight && "force-light-section")}>
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 dark:bg-[#161B22]/80 border-b border-border/40 rounded-t-xl px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-semibold" data-testid="text-queue-title">Match Queue</h3>
              <Badge variant="secondary" className="text-xs font-mono">
                {queuedMatches.length} pending
              </Badge>
              <button
                onClick={() => setSectionLight(prev => !prev)}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                  sectionLight
                    ? "bg-amber-100 text-amber-600 shadow-sm"
                    : "bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.12]"
                )}
                title={sectionLight ? "Switch to dark" : "Switch to light"}
                data-testid="button-toggle-light-queue"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
            </div>
            {isOrganiser && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {onQueueTargetSizeChange && (
                  <Select
                    value={String(queueTargetSize ?? 3)}
                    onValueChange={(v) => onQueueTargetSizeChange(Number(v))}
                  >
                    <SelectTrigger
                      className="rounded-full border-border/60 text-xs gap-1"
                      data-testid="select-queue-size-inline"
                    >
                      <span className="text-muted-foreground">Max:</span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 0 (Direct)</span>
                      </SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {isOrganiser && onGenerateMatch && onToggleAutoGenerate && (
                  autoGenerateActive ? (
                    <Button
                      size="sm"
                      onClick={() => onToggleAutoGenerate(false)}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 dark:shadow-amber-500/15"
                      data-testid="button-pause-auto-generate"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onToggleAutoGenerate(true)}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/15"
                      data-testid="button-play-auto-generate"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                      Play
                    </Button>
                  )
                )}
                {isOrganiser && onGenerateMatch && !onToggleAutoGenerate && (
                  <Button
                    size="sm"
                    onClick={onGenerateMatch}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/15"
                    data-testid="button-generate-match-queue"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                    Generate
                  </Button>
                )}
                {isOrganiser && sessionId && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => createEmptyMatch({ sessionId })}
                    disabled={isCreatingEmpty}
                    data-testid="button-create-empty-match"
                    title="Create empty match"
                  >
                    {isCreatingEmpty ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  </Button>
                )}
                {isOrganiser && sessionId && queuedMatches.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => prioritizeLowGames({ sessionId })}
                    disabled={isPrioritizing}
                    className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    data-testid="button-prioritize-low-games"
                    title="Replace all queued match players with those who have fewest games"
                  >
                    {isPrioritizing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    Low Games
                  </Button>
                )}
                {onClearQueue && queuedMatches.length > 0 && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={onClearQueue}
                    data-testid="button-clear-queue"
                    title="Clear queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {notEnoughPlayersMessage && (
          <div className="mx-4 mt-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2" data-testid="not-enough-players-message">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">{notEnoughPlayersMessage}</p>
          </div>
        )}

        {queuedMatches.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No matches in queue</p>
            <p className="text-sm mt-1 opacity-70">Generate matches to fill the queue</p>
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="relative pl-6 sm:pl-8 pr-2 sm:pr-4 py-4 overflow-hidden">
              <div className="absolute left-[1.1rem] sm:left-[1.35rem] top-4 bottom-4 w-px bg-border/60 dark:bg-border/40" />

              {queuedMatches.map((match, index) => {
                const matchTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
                const isActionsExpanded = expandedActions[match.id] || false;

                return (
                  <div
                    key={match.id}
                    className={cn("relative", index < queuedMatches.length - 1 && "mb-4")}
                    data-testid={`queue-match-${match.id}`}
                  >
                    <div className="absolute -left-[0.85rem] sm:-left-[1.05rem] top-3 z-10 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-primary-foreground font-bold text-[10px] sm:text-xs shadow-md shadow-primary/30">
                      {index + 1}
                    </div>

                    <div className="rounded-2xl bg-card dark:bg-[#161B22] border border-border/50 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between gap-1 sm:gap-2 px-2 sm:px-4 pt-3 pb-1 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Match {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {isOrganiser && sessionId && queuedMatches.length > 1 && (
                            <div className="flex items-center gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => moveQueued(index, -1)}
                                disabled={index === 0 || isReordering}
                                data-testid={`button-queue-up-${match.id}`}
                                title="Move up in queue"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => moveQueued(index, 1)}
                                disabled={index === queuedMatches.length - 1 || isReordering}
                                data-testid={`button-queue-down-${match.id}`}
                                title="Move down in queue"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <EditableTarget
                            matchId={match.id}
                            value={matchTarget}
                            isOrganiser={isOrganiser}
                            onUpdate={updateTarget}
                          />
                        </div>
                      </div>
                      {match.numberOfSets && match.numberOfSets > 1 && (
                        <div className="px-4 pb-1">
                          <Badge variant="secondary" className="text-xs">
                            {match.numberOfSets === 3 ? "Best of 3" : "2 Sets"}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-stretch min-h-[70px] px-1.5 sm:px-2 pb-2 overflow-hidden">
                        <div className="flex-1 min-w-0 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-2 sm:p-3 flex flex-col items-center justify-center gap-1">
                          <PlayerSlotEditable
                            player={match.teamAPlayer1}
                            position="teamAPlayer1Id"
                            matchId={match.id}
                            availablePlayers={availablePlayers}
                            isOrganiser={isOrganiser}
                            onSwap={onSwapPlayer}
                            variant="queue"
                            isBusy={isPlayerBusy(match.teamAPlayer1?.id)}
                            sessionMatchCount={match.teamAPlayer1?.id ? sessionMatchCounts?.[match.teamAPlayer1.id] : undefined}
                            achievements={achievements}
                            sessionMatchCounts={sessionMatchCounts}
                          />
                          <PlayerSlotEditable
                            player={match.teamAPlayer2 || null}
                            position="teamAPlayer2Id"
                            matchId={match.id}
                            availablePlayers={availablePlayers}
                            isOrganiser={isOrganiser}
                            onSwap={onSwapPlayer}
                            variant="queue"
                            isBusy={isPlayerBusy(match.teamAPlayer2?.id)}
                            sessionMatchCount={match.teamAPlayer2?.id ? sessionMatchCounts?.[match.teamAPlayer2.id] : undefined}
                            achievements={achievements}
                            sessionMatchCounts={sessionMatchCounts}
                          />
                        </div>

                        <div className="flex items-center justify-center px-1 sm:px-1.5 shrink-0">
                          <span className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-muted dark:bg-muted/60 text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground shadow-inner">
                            VS
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 p-2 sm:p-3 flex flex-col items-center justify-center gap-1">
                          <PlayerSlotEditable
                            player={match.teamBPlayer1}
                            position="teamBPlayer1Id"
                            matchId={match.id}
                            availablePlayers={availablePlayers}
                            isOrganiser={isOrganiser}
                            onSwap={onSwapPlayer}
                            variant="queue"
                            isBusy={isPlayerBusy(match.teamBPlayer1?.id)}
                            sessionMatchCount={match.teamBPlayer1?.id ? sessionMatchCounts?.[match.teamBPlayer1.id] : undefined}
                            achievements={achievements}
                            sessionMatchCounts={sessionMatchCounts}
                          />
                          <PlayerSlotEditable
                            player={match.teamBPlayer2 || null}
                            position="teamBPlayer2Id"
                            matchId={match.id}
                            availablePlayers={availablePlayers}
                            isOrganiser={isOrganiser}
                            onSwap={onSwapPlayer}
                            variant="queue"
                            isBusy={isPlayerBusy(match.teamBPlayer2?.id)}
                            sessionMatchCount={match.teamBPlayer2?.id ? sessionMatchCounts?.[match.teamBPlayer2.id] : undefined}
                            achievements={achievements}
                            sessionMatchCounts={sessionMatchCounts}
                          />
                        </div>
                      </div>

                      {isOrganiser && availableCourts.length > 0 && (
                        <div className="px-3 pb-2 flex gap-2 flex-wrap">
                          {availableCourts.map(court => (
                            <Button
                              key={court}
                              size="sm"
                              onClick={() => onAssignToCourt(match.id, court)}
                              className="flex-1 gap-1.5 bg-emerald-600 text-white font-semibold shadow-md"
                              data-testid={`button-assign-${match.id}-court-${court}`}
                            >
                              <Play className="w-3.5 h-3.5" />
                              Court {court}
                            </Button>
                          ))}
                        </div>
                      )}

                      {isOrganiser && (
                        <div className="border-t border-border/30 dark:border-border/20 px-3 py-1.5">
                          <div className="flex items-center justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleActions(match.id)}
                              data-testid={`button-toggle-actions-${match.id}`}
                              title="More actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-1 flex-wrap transition-all duration-200",
                              isActionsExpanded ? "max-h-40 opacity-100 pb-1" : "max-h-0 opacity-0 overflow-hidden"
                            )}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id, "female_only")}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-female-${match.id}`}
                              title="Female only"
                              className="text-pink-500"
                            >
                              <IoFemale className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id, "male_only")}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-male-${match.id}`}
                              title="Male only"
                              className="text-blue-500"
                            >
                              <IoMale className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id, "mixed")}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-mixed-${match.id}`}
                              title="Mixed (male + female pair)"
                              className="text-purple-500"
                            >
                              <IoMaleFemale className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id, "high_grade")}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-high-${match.id}`}
                              title="High grade (A/B)"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id, "low_grade")}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-low-${match.id}`}
                              title="Low grade (C/D)"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id, "low_games")}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-low-games-${match.id}`}
                              title="Fill with low-game players"
                              className="text-amber-500"
                            >
                              <TrendingDown className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleFilteredReshuffle(match.id)}
                              disabled={isReshuffling}
                              data-testid={`button-reshuffle-random-${match.id}`}
                              title="Random reshuffle"
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
                        </div>
                      )}

                      {reshuffleErrors[match.id] && (
                        <div className="px-3 pb-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400" data-testid={`reshuffle-error-${match.id}`}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{reshuffleErrors[match.id]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

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

export function CompletedMatches({ matches, isOrganiser = false, isSignedUp = false, currentPlayerProfileId, availablePlayers = [], onSwapPlayer, stages = [] }: { matches: CourtMatch[]; isOrganiser?: boolean; isSignedUp?: boolean; currentPlayerProfileId?: number | null; availablePlayers?: Player[]; onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void; stages?: { id: number; name: string; displayOrder: number }[] }) {
  const [scoreMatch, setScoreMatch] = useState<CourtMatch | null>(null);
  const [scoreMode, setScoreMode] = useState<"edit" | "player">("edit");
  const [editTab, setEditTab] = useState<"score" | "players">("score");
  const [teamScoreA, setTeamScoreA] = useState<string>("");
  const [teamScoreB, setTeamScoreB] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteMatch, setDeleteMatch] = useState<CourtMatch | null>(null);
  const [editSetScores, setEditSetScores] = useState<{ scoreA: string; scoreB: string }[]>([]);
  const [editSelectedSet, setEditSelectedSet] = useState<number | null>(null);
  const [editSetScoreA, setEditSetScoreA] = useState("");
  const [editSetScoreB, setEditSetScoreB] = useState("");
  const [sectionLight, setSectionLight] = useState(false);
  const { mutate: editScore, isPending: isEditPending } = useEditMatchScore();
  const { mutate: enterPlayerScore, isPending: isPlayerScorePending } = usePlayerEnterScore();
  const { mutate: removeMatch, isPending: isDeletePending } = useDeleteMatch();

  const showStageGroups = stages.length > 1;
  const stageOrderMap = new Map(stages.map(s => [s.id, s.displayOrder]));
  const stageNameMap = new Map(stages.map(s => [s.id, s.name]));
  const completedMatches = matches
    .filter(m => m.status === "COMPLETED")
    .sort((a, b) => {
      if (showStageGroups) {
        const ao = stageOrderMap.get(a.stageId ?? -1) ?? 9999;
        const bo = stageOrderMap.get(b.stageId ?? -1) ?? 9999;
        if (ao !== bo) return ao - bo;
      }
      return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
    });

  if (completedMatches.length === 0) return null;

  const isMultiSet = (match: CourtMatch | null) => {
    if (!match) return false;
    return (match.numberOfSets || 1) > 1;
  };

  const openScoreDialog = (match: CourtMatch, mode: "edit" | "player") => {
    setScoreMatch(match);
    setScoreMode(mode);
    setEditTab("score");
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
    } else {
      setTeamScoreA("");
      setTeamScoreB("");
    }
  };

  const resetFinishFlow = () => {
    setTeamScoreA("");
    setTeamScoreB("");
  };

  const getTeamALabel = (m: CourtMatch) => {
    const p1 = m.teamAPlayer1?.user?.fullName || (m.teamAPlayer1 as any)?.fullName || "Player";
    const p2 = m.teamAPlayer2 ? (m.teamAPlayer2?.user?.fullName || (m.teamAPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };

  const getTeamBLabel = (m: CourtMatch) => {
    const p1 = m.teamBPlayer1?.user?.fullName || (m.teamBPlayer1 as any)?.fullName || "Player";
    const p2 = m.teamBPlayer2 ? (m.teamBPlayer2?.user?.fullName || (m.teamBPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };




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

    const sA = Number(teamScoreA);
    const sB = Number(teamScoreB);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0 || sA === sB) return;
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
      <Card className={cn(sectionLight && "force-light-section")}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Completed Matches ({completedMatches.length})</CardTitle>
            <button
              onClick={() => setSectionLight(prev => !prev)}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                sectionLight
                  ? "bg-amber-100 text-amber-600 shadow-sm"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.12]"
              )}
              title={sectionLight ? "Switch to dark" : "Switch to light"}
              data-testid="button-toggle-light-completed"
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-4">
              {completedMatches.map((match, idx) => {
                const hasScore = (match.scoreA || 0) > 0 || (match.scoreB || 0) > 0;
                const scoreAlreadyEntered = !!match.scoreEnteredByUserId;
                const isPlayerInThisMatch = currentPlayerProfileId ? (
                  match.teamAPlayer1?.id === currentPlayerProfileId ||
                  match.teamAPlayer2?.id === currentPlayerProfileId ||
                  match.teamBPlayer1?.id === currentPlayerProfileId ||
                  match.teamBPlayer2?.id === currentPlayerProfileId
                ) : false;
                const canPlayerEnterScore = isPlayerInThisMatch && !scoreAlreadyEntered && !hasScore;
                const prevMatch = idx > 0 ? completedMatches[idx - 1] : null;
                const showStageHeader = showStageGroups && (idx === 0 || prevMatch?.stageId !== match.stageId);
                const stageHeaderLabel = match.stageId != null ? (stageNameMap.get(match.stageId) || "Stage") : "Unassigned";

                return (
                  <Fragment key={match.id}>
                  {showStageHeader && (
                    <div
                      className="pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      data-testid={`stage-header-completed-${match.stageId ?? "none"}`}
                    >
                      {stageHeaderLabel}
                    </div>
                  )}
                  <div
                    className="p-3 bg-muted/20 rounded-lg space-y-2"
                    data-testid={`completed-match-${match.id}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">
                          {match.teamAPlayer1?.user?.fullName || (match.teamAPlayer1 as any)?.fullName || "Player"}
                          {match.teamAPlayer2 && ` & ${match.teamAPlayer2?.user?.fullName || (match.teamAPlayer2 as any)?.fullName || "Player"}`}
                        </span>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <span className="text-sm">
                          {match.teamBPlayer1?.user?.fullName || (match.teamBPlayer1 as any)?.fullName || "Player"}
                          {match.teamBPlayer2 && ` & ${match.teamBPlayer2?.user?.fullName || (match.teamBPlayer2 as any)?.fullName || "Player"}`}
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
                  </Fragment>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!scoreMatch} onOpenChange={(open) => { if (!open) { setScoreMatch(null); resetFinishFlow(); setShowSuccess(false); setEditSelectedSet(null); setEditTab("score"); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showSuccess
                ? "Score Saved"
                : scoreMatch && scoreMode === "edit" && editTab === "players"
                ? "Edit Players"
                : scoreMatch && scoreMode === "edit" && isMultiSet(scoreMatch)
                ? (editSelectedSet !== null ? `Edit Set ${editSelectedSet + 1}` : "Edit Set Scores")
                : scoreMode === "edit"
                ? "Edit Match"
                : "Enter Match Score"}
            </DialogTitle>
            {!showSuccess && scoreMode === "edit" && editTab === "players" && (
              <DialogDescription>Tap a player to swap them with another session player.</DialogDescription>
            )}
            {!showSuccess && scoreMode === "edit" && editTab === "score" && !(scoreMatch && isMultiSet(scoreMatch)) && (
              <DialogDescription>Amend the score for this match. This action is logged.</DialogDescription>
            )}
            {!showSuccess && scoreMode === "edit" && editTab === "score" && scoreMatch && isMultiSet(scoreMatch) && (
              <DialogDescription>Select a set to amend its score</DialogDescription>
            )}
            {!showSuccess && scoreMode === "player" && (
              <DialogDescription>You can enter the score once. If there is a dispute, contact an admin.</DialogDescription>
            )}
          </DialogHeader>

          {showSuccess ? (
            <div className="py-8 text-center space-y-3" data-testid="score-edit-success">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Thank you. Match results have been saved.</p>
            </div>
          ) : scoreMatch && scoreMode === "edit" && editTab === "players" ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                Changing a player on a completed match will update the match record. The dialog will close after each swap.
              </div>
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team A</div>
                <div className="space-y-2">
                  <PlayerSlotEditable
                    player={scoreMatch.teamAPlayer1 || null}
                    position="teamAPlayer1Id"
                    matchId={scoreMatch.id}
                    availablePlayers={availablePlayers}
                    isOrganiser={isOrganiser}
                    onSwap={(matchId, position, newPlayerId) => {
                      onSwapPlayer?.(matchId, position, newPlayerId);
                      setScoreMatch(null);
                    }}
                    variant="queue"
                    team="A"
                  />
                  {scoreMatch.teamAPlayer2 !== undefined && (
                    <PlayerSlotEditable
                      player={scoreMatch.teamAPlayer2 || null}
                      position="teamAPlayer2Id"
                      matchId={scoreMatch.id}
                      availablePlayers={availablePlayers}
                      isOrganiser={isOrganiser}
                      onSwap={(matchId, position, newPlayerId) => {
                        onSwapPlayer?.(matchId, position, newPlayerId);
                        setScoreMatch(null);
                      }}
                      variant="queue"
                      team="A"
                    />
                  )}
                </div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team B</div>
                <div className="space-y-2">
                  <PlayerSlotEditable
                    player={scoreMatch.teamBPlayer1 || null}
                    position="teamBPlayer1Id"
                    matchId={scoreMatch.id}
                    availablePlayers={availablePlayers}
                    isOrganiser={isOrganiser}
                    onSwap={(matchId, position, newPlayerId) => {
                      onSwapPlayer?.(matchId, position, newPlayerId);
                      setScoreMatch(null);
                    }}
                    variant="queue"
                    team="B"
                  />
                  {scoreMatch.teamBPlayer2 !== undefined && (
                    <PlayerSlotEditable
                      player={scoreMatch.teamBPlayer2 || null}
                      position="teamBPlayer2Id"
                      matchId={scoreMatch.id}
                      availablePlayers={availablePlayers}
                      isOrganiser={isOrganiser}
                      onSwap={(matchId, position, newPlayerId) => {
                        onSwapPlayer?.(matchId, position, newPlayerId);
                        setScoreMatch(null);
                      }}
                      variant="queue"
                      team="B"
                    />
                  )}
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => setEditTab("score")} data-testid="button-back-to-score">
                <Pencil className="w-4 h-4" /> Edit Scores
              </Button>
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
                {isOrganiser && onSwapPlayer && availablePlayers.length > 0 && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => setEditTab("players")} data-testid="button-edit-players">
                    <UserCog className="w-4 h-4" /> Change Players
                  </Button>
                )}
              </div>
            )
          ) : scoreMatch && (
            <div className="space-y-4 pt-2" data-testid="score-edit-entry">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium truncate" data-testid="text-edit-team-a">{getTeamALabel(scoreMatch)}</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={teamScoreA}
                    onChange={(e) => setTeamScoreA(e.target.value)}
                    className="w-24 text-center text-lg font-bold"
                    data-testid="input-edit-score-a"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium truncate" data-testid="text-edit-team-b">{getTeamBLabel(scoreMatch)}</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={teamScoreB}
                    onChange={(e) => setTeamScoreB(e.target.value)}
                    className="w-24 text-center text-lg font-bold"
                    data-testid="input-edit-score-b"
                  />
                </div>
              </div>

              {teamScoreA !== "" && teamScoreB !== "" && teamScoreA === teamScoreB && (
                <p className="text-sm text-destructive text-center">Scores cannot be tied</p>
              )}

              <Button
                className="w-full gap-2"
                onClick={handleFinalConfirm}
                disabled={
                  isEditPending || isPlayerScorePending ||
                  teamScoreA === "" || teamScoreB === "" ||
                  isNaN(Number(teamScoreA)) || isNaN(Number(teamScoreB)) ||
                  Number(teamScoreA) < 0 || Number(teamScoreB) < 0 ||
                  Number(teamScoreA) === Number(teamScoreB)
                }
                data-testid="button-score-confirm"
              >
                <Check className="w-4 h-4" /> {isEditPending || isPlayerScorePending ? "Saving..." : "Confirm Scores"}
              </Button>
              {isOrganiser && scoreMode === "edit" && onSwapPlayer && availablePlayers.length > 0 && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setEditTab("players")} data-testid="button-edit-players">
                  <UserCog className="w-4 h-4" /> Change Players
                </Button>
              )}
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
