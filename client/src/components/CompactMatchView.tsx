import { useState, useEffect, useRef, useCallback } from "react";
import { type CourtMatch } from "@/components/BadmintonCourt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronDown, Trophy, CheckCircle, XCircle, Swords, Clock, Check, Pencil, Users, Target } from "lucide-react";

type Player = {
  id: number;
  fullName: string;
  category: string | null;
};

type CompactMatchViewProps = {
  matches: CourtMatch[];
  courtsToUse: number;
  availablePlayers: Player[];
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  courtNames?: string[];
  defaultPointsToPlayTo?: number;
  sessionMatchCounts?: Record<number, number>;
  onStartMatch: (matchId: number, courtNumber: number) => void;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  onEditScore?: (matchId: number, scoreA: number, scoreB: number) => void;
  onCourtNameChange?: (courtNumber: number, name: string) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  busyPlayerIds?: Set<number>;
  queueSlot?: React.ReactNode;
};

function RollingDigit({ value, color = "green" }: { value: string; color?: "green" | "white" }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevVal, setPrevVal] = useState(value);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (prevVal !== value) {
      setIsRolling(true);
      const t = setTimeout(() => {
        setDisplayValue(value);
        setPrevVal(value);
        setIsRolling(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [value, prevVal]);

  return (
    <span
      className={cn(
        "inline-block w-[1.2ch] text-center font-mono overflow-hidden relative transition-all duration-500",
        color === "green" ? "text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]" : "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
      )}
      style={{ height: "1.2em", lineHeight: "1.2em" }}
    >
      <span
        className={cn(
          "inline-block transition-transform duration-500 ease-out",
          isRolling ? "compact-digit-exit" : ""
        )}
        style={{ display: "block" }}
      >
        {isRolling ? prevVal : displayValue}
      </span>
      {isRolling && (
        <span
          className="inline-block compact-digit-enter absolute left-0 w-full"
          style={{ display: "block" }}
        >
          {value}
        </span>
      )}
    </span>
  );
}

function FuturisticTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const updateTimer = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const m1 = Math.floor(mins / 10).toString();
  const m2 = (mins % 10).toString();
  const s1 = Math.floor(secs / 10).toString();
  const s2 = (secs % 10).toString();

  return (
    <div className="flex flex-col items-center justify-center compact-timer-container" data-testid="compact-timer">
      <div className="flex items-baseline gap-[2px] leading-none">
        <RollingDigit value={m1} color="white" />
        <RollingDigit value={m2} color="white" />
        <span className="text-[#39ff14] font-mono mx-[1px] animate-pulse drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]">:</span>
        <RollingDigit value={s1} color="green" />
        <RollingDigit value={s2} color="green" />
      </div>
      <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">elapsed</span>
    </div>
  );
}

function SwapPlayerDialog({
  open,
  onOpenChange,
  currentPlayer,
  availablePlayers,
  onSwap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer: { id: number; fullName: string; category: string | null } | null;
  availablePlayers: Player[];
  onSwap: (playerId: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredPlayers = availablePlayers.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Swap Player</DialogTitle>
          <DialogDescription>Select a player to replace the current one in this match.</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search players..." value={search} onValueChange={setSearch} data-testid="input-search-swap-player" />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup>
              {filteredPlayers.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.fullName}
                  onSelect={() => {
                    onSwap(p.id);
                    onOpenChange(false);
                    setSearch("");
                  }}
                  data-testid={`compact-select-player-${p.id}`}
                >
                  <Check className={cn("mr-2 h-4 w-4", currentPlayer?.id === p.id ? "opacity-100" : "opacity-0")} />
                  {p.fullName} ({p.category || "?"})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function ClickablePlayerName({
  player,
  matchId,
  position,
  availablePlayers,
  canSwap,
  onSwapPlayer,
  showMatchCount,
  sessionMatchCount,
  className,
  isBusy,
}: {
  player: { id: number; user?: { fullName?: string } | null; category?: string | null; matchesPlayed?: number | null } | null;
  matchId: number;
  position: string;
  availablePlayers: Player[];
  canSwap: boolean;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  showMatchCount?: boolean;
  sessionMatchCount?: number;
  className?: string;
  isBusy?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = player?.user?.fullName || "Unknown";
  const matchCount = sessionMatchCount ?? null;
  const nameWithCount = showMatchCount && matchCount != null ? (
    <>{name} <span className="text-zinc-500 font-normal text-[10px] sm:text-[11px]">({matchCount})</span></>
  ) : name;

  const busyClass = isBusy ? "text-red-400 animate-pulse" : "";

  if (!canSwap || !onSwapPlayer) {
    return <span className={cn(className, busyClass)} title={isBusy ? "This player is in multiple live/queued matches" : undefined}>{nameWithCount}</span>;
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className={cn(className, busyClass, "cursor-pointer hover:underline hover:text-amber-400 transition-colors")}
        onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); } }}
        data-testid={`compact-swap-${position}-${matchId}`}
      >
        {nameWithCount}
      </span>
      <SwapPlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentPlayer={player ? { id: player.id, fullName: name, category: player.category || null } : null}
        availablePlayers={availablePlayers}
        onSwap={(newPlayerId) => onSwapPlayer(matchId, position, newPlayerId)}
      />
    </>
  );
}

function MatchCard({
  match,
  isOrganiser,
  isSignedUp,
  currentPlayerProfileId,
  availablePlayers,
  availableCourts,
  courtName,
  defaultPointsToPlayTo = 21,
  sessionMatchCounts,
  onCompleteMatch,
  onEndSet,
  onCancelMatch,
  onSwapPlayer,
  onEditScore,
  onStartMatch,
  onCourtNameChange,
  onUpdatePointsTarget,
  onUpdateSets,
  busyPlayerIds,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  availablePlayers: Player[];
  availableCourts?: number[];
  courtName?: string;
  defaultPointsToPlayTo?: number;
  sessionMatchCounts?: Record<number, number>;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  onEditScore?: (matchId: number, scoreA: number, scoreB: number) => void;
  onStartMatch?: (matchId: number, courtNumber: number) => void;
  onCourtNameChange?: (courtNumber: number, name: string) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  busyPlayerIds?: Set<number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success" | "edit-score">("input");
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [editingCourtName, setEditingCourtName] = useState(false);
  const [editCourtNameValue, setEditCourtNameValue] = useState(courtName || "");
  const [editingPoints, setEditingPoints] = useState(false);
  const courtNameInputRef = useRef<HTMLInputElement>(null);

  const teamAGrades = [match.teamAPlayer1?.category, match.teamAPlayer2?.category].filter(Boolean);
  const teamBGrades = [match.teamBPlayer1?.category, match.teamBPlayer2?.category].filter(Boolean);

  const matchSets = match.numberOfSets || 1;
  const isMultiSet = matchSets > 1;
  const currentSet = match.currentSet || 1;
  const isCompleted = match.status === "COMPLETED";
  const isLive = match.status === "LIVE";
  const isQueued = match.status === "QUEUED";
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const displayCourtName = courtName || (match.courtNumber ? `Court ${match.courtNumber}` : null);

  useEffect(() => {
    setEditCourtNameValue(courtName || (match.courtNumber ? `Court ${match.courtNumber}` : ""));
  }, [courtName, match.courtNumber]);

  useEffect(() => {
    if (editingCourtName && courtNameInputRef.current) {
      courtNameInputRef.current.focus();
      courtNameInputRef.current.select();
    }
  }, [editingCourtName]);

  const handleCourtNameSave = () => {
    const trimmed = editCourtNameValue.trim();
    if (trimmed && match.courtNumber && onCourtNameChange) {
      onCourtNameChange(match.courtNumber, trimmed);
    }
    setEditingCourtName(false);
  };

  const handlePointsSave = (val: number) => {
    if (!isNaN(val) && val >= 1 && val !== pointsTarget && onUpdatePointsTarget) {
      onUpdatePointsTarget(match.id, val);
    }
    setEditingPoints(false);
  };

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );

  const canInteract = isLive && (isOrganiser || (isSignedUp && isPlayerInMatch));
  const canSwapPlayers = (isLive || isQueued) && isOrganiser;
  const canEditCompleted = isCompleted && isOrganiser;
  const canExpandQueued = isQueued;

  const handleSubmitScore = useCallback(async () => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    if (a === b) return;

    if (step === "input") {
      setStep("confirm");
      return;
    }

    setSubmitting(true);
    try {
      if (isMultiSet) {
        await onEndSet(match.id, currentSet, a, b);
      } else {
        await onCompleteMatch(match.id, a, b);
      }
      setStep("success");
      setTimeout(() => {
        setExpanded(false);
        setStep("input");
        setScoreA("");
        setScoreB("");
      }, 1500);
    } catch {
      setStep("input");
    } finally {
      setSubmitting(false);
    }
  }, [scoreA, scoreB, step, isMultiSet, currentSet, match.id, onCompleteMatch, onEndSet]);

  const handleEditScore = useCallback(() => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a === b) return;

    setSubmitting(true);
    try {
      if (onEditScore) {
        onEditScore(match.id, a, b);
      }
      setStep("success");
      setTimeout(() => {
        setExpanded(false);
        setStep("input");
        setScoreA("");
        setScoreB("");
      }, 1500);
    } catch {
      setStep("edit-score");
    } finally {
      setSubmitting(false);
    }
  }, [scoreA, scoreB, match.id, onEditScore]);

  const handleCancel = () => {
    if (onCancelMatch) {
      onCancelMatch(match.id);
    }
  };

  const resetForm = () => {
    setStep("input");
    setScoreA("");
    setScoreB("");
  };

  const toggleExpand = () => {
    if (!canInteract && !canEditCompleted && !canSwapPlayers && !canExpandQueued) return;
    setExpanded(!expanded);
    if (expanded) resetForm();
  };

  const canExpand = canInteract || canEditCompleted || canSwapPlayers || canExpandQueued;
  const showMatchCount = isLive || isQueued;

  const teamANames = (
    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">A</span>
      <ClickablePlayerName
        player={match.teamAPlayer1}
        matchId={match.id}
        position="teamAPlayer1Id"
        availablePlayers={availablePlayers}
        canSwap={canSwapPlayers}
        onSwapPlayer={onSwapPlayer}
        showMatchCount={showMatchCount}
        sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1?.id]}
        className="text-sm sm:text-base font-semibold text-white truncate max-w-[40%] sm:max-w-none"
        isBusy={!!match.teamAPlayer1?.id && busyPlayerIds?.has(match.teamAPlayer1.id)}
      />
      {match.teamAPlayer2 && (
        <>
          <span className="text-zinc-600 text-xs">&</span>
          <ClickablePlayerName
            player={match.teamAPlayer2}
            matchId={match.id}
            position="teamAPlayer2Id"
            availablePlayers={availablePlayers}
            canSwap={canSwapPlayers}
            onSwapPlayer={onSwapPlayer}
            showMatchCount={showMatchCount}
            sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2?.id]}
            className="text-sm sm:text-base font-semibold text-white truncate max-w-[40%] sm:max-w-none"
            isBusy={!!match.teamAPlayer2?.id && busyPlayerIds?.has(match.teamAPlayer2.id)}
          />
        </>
      )}
    </div>
  );

  const teamBNames = (
    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-orange-400 shrink-0">B</span>
      <ClickablePlayerName
        player={match.teamBPlayer1}
        matchId={match.id}
        position="teamBPlayer1Id"
        availablePlayers={availablePlayers}
        canSwap={canSwapPlayers}
        onSwapPlayer={onSwapPlayer}
        showMatchCount={showMatchCount}
        sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1?.id]}
        className="text-sm sm:text-base font-semibold text-zinc-200 truncate max-w-[40%] sm:max-w-none"
        isBusy={!!match.teamBPlayer1?.id && busyPlayerIds?.has(match.teamBPlayer1.id)}
      />
      {match.teamBPlayer2 && (
        <>
          <span className="text-zinc-600 text-xs">&</span>
          <ClickablePlayerName
            player={match.teamBPlayer2}
            matchId={match.id}
            position="teamBPlayer2Id"
            availablePlayers={availablePlayers}
            canSwap={canSwapPlayers}
            onSwapPlayer={onSwapPlayer}
            showMatchCount={showMatchCount}
            sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2?.id]}
            className="text-sm sm:text-base font-semibold text-zinc-200 truncate max-w-[40%] sm:max-w-none"
            isBusy={!!match.teamBPlayer2?.id && busyPlayerIds?.has(match.teamBPlayer2.id)}
          />
        </>
      )}
    </div>
  );

  const teamADisplayNames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBDisplayNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);

  return (
    <div
      className={cn(
        "compact-match-card group relative overflow-hidden rounded-2xl border transition-all duration-300",
        isLive && "compact-match-card-live border-zinc-700/80",
        isCompleted && "compact-match-card-completed border-zinc-800/60",
        isQueued && "compact-match-card-queued border-amber-500/15 hover:border-amber-500/30"
      )}
      data-testid={`compact-match-card-${match.id}`}
    >
      <div
        role="button"
        tabIndex={canExpand ? 0 : -1}
        aria-expanded={expanded}
        aria-label={`Match: ${teamADisplayNames.join(" & ")} vs ${teamBDisplayNames.join(" & ")}${isLive ? " - Live" : isCompleted ? " - Completed" : " - Queued"}`}
        className={cn(
          "flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 sm:py-4 select-none",
          canExpand ? "cursor-pointer" : "cursor-default"
        )}
        onClick={toggleExpand}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(); } }}
        data-testid={`compact-match-toggle-${match.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {match.courtNumber && (
              editingCourtName && isOrganiser ? (
                <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    ref={courtNameInputRef}
                    type="text"
                    value={editCourtNameValue}
                    onChange={(e) => setEditCourtNameValue(e.target.value)}
                    onBlur={handleCourtNameSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCourtNameSave();
                      if (e.key === "Escape") { setEditCourtNameValue(displayCourtName || ""); setEditingCourtName(false); }
                    }}
                    className="w-28 text-[10px] px-1.5 py-0.5 font-semibold bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-[#39ff14]/50"
                    data-testid={`input-compact-court-name-${match.courtNumber}`}
                  />
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-semibold tracking-wider border-zinc-600 shrink-0",
                    isLive ? "text-[#39ff14] border-[#39ff14]/30 bg-[#39ff14]/5" : "text-zinc-400",
                    isOrganiser && "cursor-pointer"
                  )}
                  onClick={(e) => {
                    if (isOrganiser) {
                      e.stopPropagation();
                      setEditingCourtName(true);
                    }
                  }}
                  data-testid={`badge-compact-court-name-${match.courtNumber}`}
                >
                  {displayCourtName || `C${match.courtNumber}`}
                  {isOrganiser && <Pencil className="w-2 h-2 ml-1 inline-block opacity-60" />}
                </Badge>
              )
            )}
            {isQueued && match.queuePosition && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold tracking-wider border-amber-500/20 text-amber-400/60 bg-amber-500/5 shrink-0">
                #{match.queuePosition}
              </Badge>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#39ff14]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                Live
              </span>
            )}
            {isCompleted && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                Finished
              </span>
            )}
            {isQueued && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/50">
                Queued
              </span>
            )}
            {(isLive || isQueued) && (
              editingPoints && isOrganiser ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <span className="text-[9px] text-zinc-500">Play to</span>
                  <input
                    type="number"
                    min="1"
                    className="w-12 border border-zinc-600 rounded px-1 py-0 text-[10px] bg-zinc-800 text-white text-center outline-none focus:border-amber-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    defaultValue={pointsTarget}
                    autoFocus
                    onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10));
                      if (e.key === "Escape") setEditingPoints(false);
                    }}
                    data-testid={`input-compact-points-target-${match.id}`}
                  />
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400 shrink-0",
                    isOrganiser && "cursor-pointer"
                  )}
                  onClick={(e) => {
                    if (isOrganiser) {
                      e.stopPropagation();
                      setEditingPoints(true);
                    }
                  }}
                  data-testid={`badge-compact-points-target-${match.id}`}
                >
                  <Target className="w-2 h-2 mr-0.5 inline-block" />
                  {pointsTarget}
                  {isOrganiser && <Pencil className="w-2 h-2 ml-0.5 inline-block opacity-50" />}
                </Badge>
              )
            )}
            {(isLive || isQueued) && isOrganiser && onUpdateSets && (
              <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <Select
                  value={String(matchSets)}
                  onValueChange={(v) => {
                    const val = Number(v);
                    if (onUpdateSets) onUpdateSets(match.id, val);
                  }}
                >
                  <SelectTrigger className="h-5 w-auto min-w-0 gap-0.5 px-1.5 text-[9px] bg-zinc-800 border-zinc-700 text-zinc-400" data-testid={`select-compact-sets-${match.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" data-testid="compact-select-sets-1">1 Set</SelectItem>
                    <SelectItem value="2" data-testid="compact-select-sets-2">2 Sets</SelectItem>
                    <SelectItem value="3" data-testid="compact-select-sets-3">Best of 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(isLive || isQueued) && !isOrganiser && isMultiSet && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400 shrink-0" data-testid={`badge-compact-sets-${match.id}`}>
                {matchSets === 3 ? "Bo3" : `${matchSets}S`}
              </Badge>
            )}
            {isMultiSet && isLive && (
              <span className="text-[10px] text-zinc-500">Set {currentSet}</span>
            )}
            {canSwapPlayers && (
              <Users className="w-3 h-3 text-amber-400/50 ml-auto" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {teamANames}
                {teamAGrades.length > 0 && (
                  <span className="text-[10px] sm:text-[11px] text-amber-400/70 font-mono shrink-0">{teamAGrades.join("/")}</span>
                )}
              </div>
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 via-zinc-700/40 to-orange-500/20" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">vs</span>
                <div className="flex-1 h-px bg-gradient-to-r from-orange-500/20 via-zinc-700/40 to-emerald-500/20" />
              </div>
              <div className="flex items-center gap-1.5">
                {teamBNames}
                {teamBGrades.length > 0 && (
                  <span className="text-[10px] sm:text-[11px] text-amber-400/70 font-mono shrink-0">{teamBGrades.join("/")}</span>
                )}
              </div>
            </div>

            {isCompleted && match.scoreA != null && match.scoreB != null && (
              <div className="flex flex-col items-end shrink-0 mr-1 gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-emerald-400/60 uppercase">A</span>
                  <span className={cn("text-lg font-bold font-mono tabular-nums", (match.scoreA ?? 0) > (match.scoreB ?? 0) ? "text-white" : "text-zinc-500")}>
                    {match.scoreA}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-orange-400/60 uppercase">B</span>
                  <span className={cn("text-lg font-bold font-mono tabular-nums", (match.scoreB ?? 0) > (match.scoreA ?? 0) ? "text-white" : "text-zinc-500")}>
                    {match.scoreB}
                  </span>
                </div>
              </div>
            )}

            {isMultiSet && isLive && match.setScores && match.setScores.length > 0 && (
              <div className="flex flex-col items-end shrink-0 mr-1 gap-0.5">
                {match.setScores.map((s, i) => (
                  <span key={i} className="text-[10px] font-mono text-zinc-400">
                    {s.scoreA}-{s.scoreB}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLive && match.startedAt && typeof match.startedAt === "string" && (
          <div className="shrink-0 compact-timer-text">
            <FuturisticTimer startedAt={match.startedAt} />
          </div>
        )}

        {canExpand && (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-zinc-500 transition-transform duration-300 shrink-0",
              expanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <div
        ref={contentRef}
        className={cn(
          "compact-match-dropdown overflow-hidden transition-all duration-300 ease-out",
          expanded ? "compact-match-dropdown-open" : "compact-match-dropdown-closed"
        )}
        style={{
          maxHeight: expanded ? contentRef.current?.scrollHeight ? `${contentRef.current.scrollHeight + 20}px` : "400px" : "0px"
        }}
      >
        <div className={cn("px-3 sm:px-4 pb-3 sm:pb-4 pt-1 border-t", isQueued ? "border-amber-500/10" : "border-zinc-700/50")}>
          {isQueued ? (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/80 rounded-xl p-3 border border-emerald-500/15">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-bold">Team A</p>
                  {[match.teamAPlayer1, match.teamAPlayer2].filter(Boolean).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-xs sm:text-sm text-zinc-200 truncate font-medium">{p?.user?.fullName}</span>
                      <div className="flex items-center gap-1.5 ml-1 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-500">{sessionMatchCounts?.[p?.id ?? 0] ?? 0}g</span>
                        <span className="text-[10px] font-mono text-amber-400/50">{p?.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-900/80 rounded-xl p-3 border border-orange-500/15">
                  <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-2 font-bold">Team B</p>
                  {[match.teamBPlayer1, match.teamBPlayer2].filter(Boolean).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-xs sm:text-sm text-zinc-200 truncate font-medium">{p?.user?.fullName}</span>
                      <div className="flex items-center gap-1.5 ml-1 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-500">{sessionMatchCounts?.[p?.id ?? 0] ?? 0}g</span>
                        <span className="text-[10px] font-mono text-amber-400/50">{p?.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {isOrganiser && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                  <p className="text-[10px] text-amber-400/50 uppercase tracking-wider font-semibold">Admin Controls</p>
                  {availableCourts && availableCourts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableCourts.map(court => (
                        <Button
                          key={court}
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-xs border-amber-500/20 text-amber-400/80 hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10 bg-amber-500/5"
                          onClick={(e) => { e.stopPropagation(); onStartMatch?.(match.id, court); }}
                          data-testid={`compact-assign-court-${match.id}-${court}`}
                        >
                          Court {court}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">All courts occupied</p>
                  )}
                  <p className="text-[10px] text-zinc-600">Tap a player name to swap</p>
                </>
              )}
            </div>
          ) : isCompleted && step !== "edit-score" && step !== "success" ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-zinc-300">Final Score</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {match.scoreA} - {match.scoreB}
                </div>
              </div>
              {isMultiSet && match.setScores && match.setScores.length > 0 && (
                <div className="flex gap-3 pt-1">
                  {match.setScores.map((s, i) => (
                    <div key={i} className="text-xs text-zinc-400 bg-zinc-800/50 rounded px-2 py-1">
                      Set {i + 1}: <span className="font-mono text-zinc-300">{s.scoreA}-{s.scoreB}</span>
                    </div>
                  ))}
                </div>
              )}
              {match.scoreEnteredByUser && (
                <p className="text-[11px] text-zinc-500 pt-1">
                  Scored by {match.scoreEnteredByUser.fullName}
                  {match.scoreUpdatedByUser && ` · Amended by ${match.scoreUpdatedByUser.fullName}`}
                </p>
              )}
              {canEditCompleted && onEditScore && (
                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScoreA(String(match.scoreA ?? ""));
                      setScoreB(String(match.scoreB ?? ""));
                      setStep("edit-score");
                    }}
                    data-testid={`compact-edit-score-${match.id}`}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit Score
                  </Button>
                </div>
              )}
            </div>
          ) : step === "edit-score" ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Edit Score (Admin)</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] sm:text-[11px] uppercase tracking-wider text-emerald-400 mb-0.5 block font-bold">
                    Team A
                  </label>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mb-1.5 truncate">{teamADisplayNames.join(" & ") || "Team A"}</p>
                  <Input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800/80 border-emerald-500/30 text-white text-center text-xl font-mono h-12 compact-score-input focus:border-emerald-400/50 focus:ring-emerald-400/20"
                    placeholder="0"
                    data-testid={`compact-edit-score-a-${match.id}`}
                  />
                </div>
                <div className="text-zinc-600 font-bold text-sm mt-8">vs</div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] sm:text-[11px] uppercase tracking-wider text-orange-400 mb-0.5 block font-bold">
                    Team B
                  </label>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mb-1.5 truncate">{teamBDisplayNames.join(" & ") || "Team B"}</p>
                  <Input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800/80 border-orange-500/30 text-white text-center text-xl font-mono h-12 compact-score-input focus:border-orange-400/50 focus:ring-orange-400/20"
                    placeholder="0"
                    data-testid={`compact-edit-score-b-${match.id}`}
                  />
                </div>
              </div>
              {scoreA && scoreB && scoreA === scoreB && (
                <p className="text-[11px] text-red-400 text-center">Scores cannot be tied</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={(e) => { e.stopPropagation(); resetForm(); }}
                  data-testid={`compact-edit-cancel-${match.id}`}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                  onClick={(e) => { e.stopPropagation(); handleEditScore(); }}
                  disabled={!scoreA || !scoreB || scoreA === scoreB || submitting}
                  data-testid={`compact-edit-save-${match.id}`}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  {submitting ? "Saving..." : "Save Score"}
                </Button>
              </div>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <CheckCircle className="w-8 h-8 text-[#39ff14] drop-shadow-[0_0_12px_rgba(57,255,20,0.5)]" />
              <span className="text-sm font-semibold text-white">Score Saved</span>
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-3 pt-2">
              <div className="text-center">
                <p className="text-xs text-zinc-400 mb-3">Confirm {isMultiSet ? `Set ${currentSet}` : "final"} result</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Team A</p>
                    <div className={cn("text-3xl font-bold font-mono", parseInt(scoreA) > parseInt(scoreB) ? "text-[#39ff14]" : "text-white")}>
                      {scoreA}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 truncate max-w-[120px]">{teamADisplayNames.join(" & ")}</p>
                  </div>
                  <Swords className="w-5 h-5 text-amber-400/60" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-1">Team B</p>
                    <div className={cn("text-3xl font-bold font-mono", parseInt(scoreB) > parseInt(scoreA) ? "text-[#39ff14]" : "text-white")}>
                      {scoreB}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 truncate max-w-[120px]">{teamBDisplayNames.join(" & ")}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={(e) => { e.stopPropagation(); setStep("input"); }}
                  data-testid={`compact-match-back-${match.id}`}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30 hover:bg-[#39ff14]/20"
                  onClick={(e) => { e.stopPropagation(); handleSubmitScore(); }}
                  disabled={submitting}
                  data-testid={`compact-match-confirm-${match.id}`}
                >
                  {submitting ? "Saving..." : "Confirm"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] sm:text-[11px] uppercase tracking-wider text-emerald-400 mb-0.5 block font-bold">
                    Team A
                  </label>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mb-1.5 truncate">{teamADisplayNames.join(" & ") || "Team A"}</p>
                  <Input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800/80 border-emerald-500/30 text-white text-center text-xl font-mono h-12 compact-score-input focus:border-emerald-400/50 focus:ring-emerald-400/20"
                    placeholder="0"
                    data-testid={`compact-score-a-${match.id}`}
                  />
                </div>
                <div className="text-zinc-600 font-bold text-sm mt-8">vs</div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] sm:text-[11px] uppercase tracking-wider text-orange-400 mb-0.5 block font-bold">
                    Team B
                  </label>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mb-1.5 truncate">{teamBDisplayNames.join(" & ") || "Team B"}</p>
                  <Input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800/80 border-orange-500/30 text-white text-center text-xl font-mono h-12 compact-score-input focus:border-orange-400/50 focus:ring-orange-400/20"
                    placeholder="0"
                    data-testid={`compact-score-b-${match.id}`}
                  />
                </div>
              </div>

              {scoreA && scoreB && scoreA === scoreB && (
                <p className="text-[11px] text-red-400 text-center">Scores cannot be tied</p>
              )}

              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {isOrganiser && onCancelMatch && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 text-xs"
                    onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                    data-testid={`compact-match-cancel-${match.id}`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 compact-submit-btn text-xs"
                  onClick={(e) => { e.stopPropagation(); handleSubmitScore(); }}
                  disabled={!scoreA || !scoreB || scoreA === scoreB || submitting}
                  data-testid={`compact-match-submit-${match.id}`}
                >
                  <Trophy className="w-3.5 h-3.5 mr-1" />
                  {isMultiSet ? `End Set ${currentSet}` : "Finish Match"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CompactMatchView({
  matches,
  courtsToUse,
  availablePlayers,
  isOrganiser,
  isSignedUp,
  currentPlayerProfileId,
  courtNames,
  defaultPointsToPlayTo,
  sessionMatchCounts,
  onStartMatch,
  onCompleteMatch,
  onEndSet,
  onCancelMatch,
  onSwapPlayer,
  onEditScore,
  onCourtNameChange,
  onUpdatePointsTarget,
  onUpdateSets,
  busyPlayerIds,
  queueSlot,
}: CompactMatchViewProps) {
  const liveMatches = matches.filter(m => m.status === "LIVE");
  const queuedMatches = matches.filter(m => m.status === "QUEUED").sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
  const completedMatches = matches.filter(m => m.status === "COMPLETED").sort((a, b) => {
    if (!a.completedAt || !b.completedAt) return 0;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });

  const availableCourts = Array.from({ length: courtsToUse }, (_, i) => i + 1)
    .filter(c => !liveMatches.some(m => m.courtNumber === c));

  return (
    <div className="space-y-6 compact-match-view" data-testid="compact-match-view">
      {liveMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Live Matches
            </h4>
            <span className="text-xs text-zinc-600">({liveMatches.length})</span>
          </div>
          <div className="space-y-2">
            {liveMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isOrganiser={isOrganiser}
                isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId}
                availablePlayers={availablePlayers}
                courtName={match.courtNumber ? courtNames?.[match.courtNumber - 1] : undefined}
                defaultPointsToPlayTo={defaultPointsToPlayTo}
                sessionMatchCounts={sessionMatchCounts}
                onCompleteMatch={onCompleteMatch}
                onEndSet={onEndSet}
                onCancelMatch={onCancelMatch}
                onSwapPlayer={onSwapPlayer}
                onEditScore={onEditScore}
                onCourtNameChange={onCourtNameChange}
                onUpdatePointsTarget={onUpdatePointsTarget}
                onUpdateSets={onUpdateSets}
                busyPlayerIds={busyPlayerIds}
              />
            ))}
          </div>
        </div>
      )}

      {queuedMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Up Next
            </h4>
            <span className="text-xs text-zinc-600">({queuedMatches.length})</span>
          </div>
          <div className="space-y-2">
            {queuedMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isOrganiser={isOrganiser}
                isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId}
                availablePlayers={availablePlayers}
                availableCourts={availableCourts}
                defaultPointsToPlayTo={defaultPointsToPlayTo}
                sessionMatchCounts={sessionMatchCounts}
                onCompleteMatch={onCompleteMatch}
                onEndSet={onEndSet}
                onSwapPlayer={onSwapPlayer}
                onEditScore={onEditScore}
                onStartMatch={onStartMatch}
                onUpdatePointsTarget={onUpdatePointsTarget}
                onUpdateSets={onUpdateSets}
                busyPlayerIds={busyPlayerIds}
              />
            ))}
          </div>
        </div>
      )}

      {queueSlot}

      {completedMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-400/60" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Completed
            </h4>
            <span className="text-xs text-zinc-600">({completedMatches.length})</span>
          </div>
          <div className="space-y-2">
            {completedMatches.slice(0, 20).map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isOrganiser={isOrganiser}
                isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId}
                availablePlayers={availablePlayers}
                onCompleteMatch={onCompleteMatch}
                onEndSet={onEndSet}
                onCancelMatch={onCancelMatch}
                onSwapPlayer={onSwapPlayer}
                onEditScore={onEditScore}
              />
            ))}
          </div>
        </div>
      )}

      {liveMatches.length === 0 && queuedMatches.length === 0 && completedMatches.length === 0 && (
        <div className="text-center py-12">
          <Swords className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No matches yet</p>
          <p className="text-xs text-zinc-600 mt-1">Generate matches to get started</p>
        </div>
      )}
    </div>
  );
}
