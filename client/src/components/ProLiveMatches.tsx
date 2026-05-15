import { useState, useEffect, useCallback, useRef } from "react";
import { type CourtMatch } from "@/components/BadmintonCourt";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Trophy, CheckCircle, XCircle, Pencil, Check, Minus, Plus,
  CircleDot, X, Flame, Lightbulb, Pause, AlertCircle, Info,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

type Player = {
  id: number;
  fullName: string;
  category: string | null;
};

const COURT_COLORS = [
  { primary: "emerald", glow: "rgba(52,211,153,0.6)", ring: "rgb(52,211,153)", bg: "rgba(52,211,153,0.08)" },
  { primary: "blue", glow: "rgba(96,165,250,0.6)", ring: "rgb(96,165,250)", bg: "rgba(96,165,250,0.08)" },
  { primary: "violet", glow: "rgba(167,139,250,0.6)", ring: "rgb(167,139,250)", bg: "rgba(167,139,250,0.08)" },
  { primary: "amber", glow: "rgba(251,191,36,0.6)", ring: "rgb(251,191,36)", bg: "rgba(251,191,36,0.08)" },
  { primary: "rose", glow: "rgba(251,113,133,0.6)", ring: "rgb(251,113,133)", bg: "rgba(251,113,133,0.08)" },
  { primary: "cyan", glow: "rgba(34,211,238,0.6)", ring: "rgb(34,211,238)", bg: "rgba(34,211,238,0.08)" },
  { primary: "orange", glow: "rgba(251,146,60,0.6)", ring: "rgb(251,146,60)", bg: "rgba(251,146,60,0.08)" },
  { primary: "teal", glow: "rgba(45,212,191,0.6)", ring: "rgb(45,212,191)", bg: "rgba(45,212,191,0.08)" },
  { primary: "pink", glow: "rgba(244,114,182,0.6)", ring: "rgb(244,114,182)", bg: "rgba(244,114,182,0.08)" },
  { primary: "lime", glow: "rgba(163,230,53,0.6)", ring: "rgb(163,230,53)", bg: "rgba(163,230,53,0.08)" },
];

function getCourtColor(courtNumber: number) {
  return COURT_COLORS[(courtNumber - 1) % COURT_COLORS.length];
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono text-xs text-gray-400 dark:text-white/50 tabular-nums" data-testid="pro-live-timer">
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

function SwapPlayerDialog({
  open, onOpenChange, currentPlayer, availablePlayers, onSwap, busyPlayerIds, sessionMatchCounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer: { id: number; fullName: string; category: string | null } | null;
  availablePlayers: Player[];
  onSwap: (playerId: number) => void;
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
}) {
  const [search, setSearch] = useState("");
  const freePlayersOnly = availablePlayers.filter(p => {
    if (currentPlayer && p.id === currentPlayer.id) return true;
    return !busyPlayerIds?.has(p.id);
  });
  const filtered = freePlayersOnly
    .filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sessionMatchCounts?.[a.id] ?? 0) - (sessionMatchCounts?.[b.id] ?? 0));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Swap Player</DialogTitle>
          <DialogDescription>Select an available player (players in active matches are hidden).</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search players..." value={search} onValueChange={setSearch} data-testid="input-pro-swap-search" />
          <CommandList>
            <CommandEmpty>No available players found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((p) => (
                <CommandItem key={p.id} value={p.fullName} onSelect={() => { onSwap(p.id); onOpenChange(false); setSearch(""); }} data-testid={`pro-select-player-${p.id}`}>
                  <Check className={cn("mr-2 h-4 w-4", currentPlayer?.id === p.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{p.fullName} ({p.category || "?"})</span>
                  <span className="text-xs text-muted-foreground ml-2 tabular-nums" data-testid={`pro-swap-count-${p.id}`}>{sessionMatchCounts?.[p.id] ?? 0}g</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export type PlayerAchievements = Record<number, { trophy?: boolean; fire?: boolean }>;

function PlayerAchievementIcons({ playerId, achievements }: { playerId?: number; achievements?: PlayerAchievements }) {
  if (!playerId || !achievements) return null;
  const a = achievements[playerId];
  if (!a) return null;
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5 align-middle">
      {a.trophy && (
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild>
            <Trophy className="w-3 h-3 text-amber-400 inline-block" data-testid={`icon-trophy-${playerId}`} />
          </TooltipTrigger><TooltipContent>Recent winner</TooltipContent></Tooltip>
        </TooltipProvider>
      )}
      {a.fire && (
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild>
            <Flame className="w-3 h-3 text-orange-400 inline-block" data-testid={`icon-fire-${playerId}`} />
          </TooltipTrigger><TooltipContent>On a hot streak</TooltipContent></Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
}

function ClickablePlayerName({
  player, matchId, position, availablePlayers, canSwap, onSwapPlayer, sessionMatchCount, showMatchCount, className, isBusy, style, achievements, busyPlayerIds, sessionMatchCounts,
}: {
  player: { id: number; user?: { fullName?: string } | null; category?: string | null; gender?: string | null; matchesPlayed?: number | null } | null;
  matchId: number;
  position: string;
  availablePlayers: Player[];
  canSwap: boolean;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  sessionMatchCount?: number;
  showMatchCount?: boolean;
  className?: string;
  isBusy?: boolean;
  style?: React.CSSProperties;
  achievements?: PlayerAchievements;
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = player ? (player.user?.fullName || "Unknown") : "Empty";
  const isFemale = player?.gender === "FEMALE";
  const femaleStyle: React.CSSProperties = isFemale ? { color: '#ec4899' } : {};
  const mergedStyle = { ...style, ...femaleStyle };
  const countNode = showMatchCount && sessionMatchCount != null ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 text-gray-400 dark:text-white/30 font-normal text-[10px] ml-0.5 cursor-help">
            <Info className="w-2.5 h-2.5" />
            ({sessionMatchCount})
          </span>
        </TooltipTrigger>
        <TooltipContent>Games played this session</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;
  const nameWithCount = (
    <>
      {name}
      {countNode}
      {player && <PlayerAchievementIcons playerId={player.id} achievements={achievements} />}
    </>
  );
  const busyClass = isBusy ? "text-red-400 animate-pulse" : "";
  const emptyClass = !player ? "opacity-50 italic" : "";
  if (!canSwap || !onSwapPlayer) return <span className={cn(className, busyClass, emptyClass, isFemale && "!text-pink-500")} style={mergedStyle}>{nameWithCount}</span>;
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span role="button" tabIndex={0} className={cn(className, busyClass, isFemale && "!text-pink-500", "cursor-pointer hover:underline hover:text-amber-400 active:text-amber-300 transition-colors")}
              style={mergedStyle}
              onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); } }}
              data-testid={`pro-swap-${position}-${matchId}`}
            >{nameWithCount}<Pencil className="w-2 h-2 opacity-30 inline ml-0.5 align-middle shrink-0 hidden sm:inline" /></span>
          </TooltipTrigger>
          <TooltipContent>Click to swap this player</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SwapPlayerDialog open={dialogOpen} onOpenChange={setDialogOpen}
        currentPlayer={player ? { id: player.id, fullName: name, category: player.category || null } : null}
        availablePlayers={availablePlayers} onSwap={(newPlayerId) => onSwapPlayer(matchId, position, newPlayerId)}
        busyPlayerIds={busyPlayerIds} sessionMatchCounts={sessionMatchCounts} />
    </>
  );
}

function scoreColorClass(value: number, target: number): string {
  if (value <= 0) return "text-gray-400 dark:text-white/40";
  if (value >= target) return "text-emerald-500 dark:text-emerald-400";
  if (value >= target - 1) return "text-amber-500 dark:text-amber-400";
  if (value >= target - 3) return "text-yellow-500 dark:text-yellow-300";
  return "text-gray-900 dark:text-white";
}

function InlineScorePanel({
  match, isOrganiser, isSignedUp, currentPlayerProfileId, defaultPointsToPlayTo = 21,
  onCompleteMatch, onEndSet, onCancelMatch,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  defaultPointsToPlayTo?: number;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
}) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [submitting, setSubmitting] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matchSets = match.numberOfSets || 1;
  const isMultiSet = matchSets > 1;
  const currentSet = match.currentSet || 1;
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const softCap = Math.ceil(pointsTarget * 1.5);

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );
  const canInteract = isOrganiser || (isSignedUp && isPlayerInMatch);

  const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);

  useEffect(() => {
    return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); };
  }, []);

  useEffect(() => {
    setScoreA(""); setScoreB(""); setStep("input"); setSubmitting(false);
  }, [match.id]);

  const resetForm = () => { setStep("input"); setScoreA(""); setScoreB(""); };

  const numA = parseInt(scoreA);
  const numB = parseInt(scoreB);
  const savedA = match.scoreA || 0;
  const savedB = match.scoreB || 0;
  const isModified = (scoreA !== "" && !isNaN(numA) && numA !== savedA) ||
                     (scoreB !== "" && !isNaN(numB) && numB !== savedB);
  const isTied = scoreA && scoreB && numA === numB;
  const overSoftCap = (!isNaN(numA) && numA > softCap) || (!isNaN(numB) && numB > softCap);

  const handleSubmitScore = useCallback(async () => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a === b) return;
    if (step === "input") { setStep("confirm"); return; }
    setSubmitting(true);
    try {
      if (isMultiSet) await onEndSet(match.id, currentSet, a, b);
      else await onCompleteMatch(match.id, a, b);
      setStep("success");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => resetForm(), 1500);
    } catch { setStep("input"); } finally { setSubmitting(false); }
  }, [scoreA, scoreB, step, isMultiSet, currentSet, match.id, onCompleteMatch, onEndSet]);

  if (!canInteract) return null;

  if (step === "success") {
    return (
      <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100 dark:border-white/[0.05] bg-emerald-50 dark:bg-emerald-500/5">
        <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Score Saved</span>
      </div>
    );
  }

  if (step === "confirm") {
    const winnerA = numA > numB;
    return (
      <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-4 space-y-3 bg-amber-50/40 dark:bg-amber-500/[0.03]" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] text-gray-600 dark:text-white/60 text-center font-semibold uppercase tracking-wider">
          Confirm {isMultiSet ? `Set ${currentSet}` : "final"} result
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className={cn("rounded-lg border-2 p-3 text-center transition-all",
            winnerA
              ? "border-emerald-400/60 bg-emerald-500/10"
              : "border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] opacity-60"
          )}>
            <p className="text-[9px] text-gray-500 dark:text-white/50 mb-1 truncate uppercase tracking-wider font-bold">Team A</p>
            <p className="text-[10px] text-gray-600 dark:text-white/60 truncate mb-2">{teamANames.join(" & ") || "—"}</p>
            <div className={cn("text-4xl font-black tabular-nums", winnerA ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-white/40")}>{scoreA}</div>
            {winnerA && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Winner</p>}
          </div>
          <div className={cn("rounded-lg border-2 p-3 text-center transition-all",
            !winnerA
              ? "border-emerald-400/60 bg-emerald-500/10"
              : "border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] opacity-60"
          )}>
            <p className="text-[9px] text-gray-500 dark:text-white/50 mb-1 truncate uppercase tracking-wider font-bold">Team B</p>
            <p className="text-[10px] text-gray-600 dark:text-white/60 truncate mb-2">{teamBNames.join(" & ") || "—"}</p>
            <div className={cn("text-4xl font-black tabular-nums", !winnerA ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-white/40")}>{scoreB}</div>
            {!winnerA && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Winner</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all"
            onClick={() => setStep("input")} data-testid={`pro-inline-back-${match.id}`}>Back</button>
          <button className="flex-1 px-3 py-2.5 text-sm font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all shadow-sm"
            onClick={handleSubmitScore} disabled={submitting} data-testid={`pro-inline-confirm-${match.id}`}>
            {submitting ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t px-3 py-3 space-y-2.5 transition-colors",
        isModified
          ? "border-amber-400/40 dark:border-amber-400/30 bg-amber-50/40 dark:bg-amber-500/[0.04]"
          : "border-gray-100 dark:border-white/[0.05]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase tracking-wider">
          {isMultiSet ? `Set ${currentSet} Score` : "Score"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 dark:text-white/40">to {pointsTarget}</span>
          {isModified && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider" data-testid={`pro-inline-modified-${match.id}`}>
              <AlertCircle className="w-2.5 h-2.5" /> Unsaved
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Team A */}
        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] p-2 space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest font-bold text-gray-500 dark:text-white/50 block text-center">Team A</label>
          <div className="flex items-center gap-1">
            <button className="w-9 h-11 flex items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-95 transition-all"
              onClick={() => setScoreA(String(Math.max(0, (parseInt(scoreA) || 0) - 1)))} data-testid={`pro-inline-a-minus-${match.id}`}>
              <Minus className="w-4 h-4" />
            </button>
            <Input
              type="number"
              min="0"
              max={softCap}
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className={cn(
                "bg-white dark:bg-slate-800/80 text-center text-2xl font-black h-11 tabular-nums border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-400/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                scoreColorClass(numA || 0, pointsTarget)
              )}
              placeholder="0"
              data-testid={`pro-inline-a-score-${match.id}`}
            />
            <button className="w-9 h-11 flex items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-95 transition-all"
              onClick={() => setScoreA(String((parseInt(scoreA) || 0) + 1))} data-testid={`pro-inline-a-plus-${match.id}`}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Team B */}
        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] p-2 space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest font-bold text-gray-500 dark:text-white/50 block text-center">Team B</label>
          <div className="flex items-center gap-1">
            <button className="w-9 h-11 flex items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-95 transition-all"
              onClick={() => setScoreB(String(Math.max(0, (parseInt(scoreB) || 0) - 1)))} data-testid={`pro-inline-b-minus-${match.id}`}>
              <Minus className="w-4 h-4" />
            </button>
            <Input
              type="number"
              min="0"
              max={softCap}
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              className={cn(
                "bg-white dark:bg-slate-800/80 text-center text-2xl font-black h-11 tabular-nums border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-400/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                scoreColorClass(numB || 0, pointsTarget)
              )}
              placeholder="0"
              data-testid={`pro-inline-b-score-${match.id}`}
            />
            <button className="w-9 h-11 flex items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] active:scale-95 transition-all"
              onClick={() => setScoreB(String((parseInt(scoreB) || 0) + 1))} data-testid={`pro-inline-b-plus-${match.id}`}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isTied && (
        <p className="text-[11px] text-red-500 dark:text-red-400 text-center flex items-center justify-center gap-1" data-testid={`pro-inline-tie-${match.id}`}>
          <AlertCircle className="w-3 h-3" /> Scores cannot be tied
        </p>
      )}
      {overSoftCap && !isTied && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" /> Score above {softCap} — double-check
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {isOrganiser && onCancelMatch && (
          <button className="px-3 py-3 text-xs font-semibold rounded-lg border border-red-500/25 text-red-500 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 active:scale-95 transition-all"
            onClick={() => onCancelMatch(match.id)} data-testid={`pro-inline-cancel-${match.id}`}>
            <XCircle className="w-3.5 h-3.5 mr-1 inline" />Cancel
          </button>
        )}
        <button
          className={cn(
            "flex-1 px-4 py-3.5 text-sm font-bold rounded-lg border-2 transition-all active:scale-95 inline-flex items-center justify-center gap-2 shadow-sm",
            scoreA && scoreB && !isTied
              ? "bg-gradient-to-b from-rose-500 to-red-600 border-red-700/40 text-white hover:from-rose-400 hover:to-red-500 shadow-red-500/20 shadow-md"
              : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30"
          )}
          onClick={handleSubmitScore}
          disabled={!scoreA || !scoreB || !!isTied || submitting}
          data-testid={`pro-inline-end-${match.id}`}
        >
          <Trophy className="w-4 h-4" />
          {isMultiSet ? `End Set ${currentSet}` : "End Match"}
        </button>
      </div>
    </div>
  );
}

function ManagerPlayerSlot({
  player, position, matchId, availablePlayers, isOrganiser, onSwapPlayer,
  sessionMatchCounts, busyPlayerIds, achievements,
}: {
  player: any;
  position: string;
  matchId: number;
  availablePlayers: Player[];
  isOrganiser: boolean;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  sessionMatchCounts?: Record<number, number>;
  busyPlayerIds?: Set<number>;
  achievements?: PlayerAchievements;
}) {
  const isFemale = player?.gender === "FEMALE";
  return (
    <div
      className="flex items-center px-2.5 py-1.5 rounded-md border transition-all border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]"
      style={isFemale ? { borderColor: 'rgba(236,72,153,0.3)', backgroundColor: 'rgba(236,72,153,0.06)' } : undefined}
      data-testid={`manager-slot-${position}-${matchId}`}
    >
      <ClickablePlayerName
        player={player || null}
        matchId={matchId}
        position={position}
        availablePlayers={availablePlayers}
        canSwap={isOrganiser && !!onSwapPlayer}
        onSwapPlayer={onSwapPlayer}
        showMatchCount
        sessionMatchCount={player?.id ? sessionMatchCounts?.[player.id] : undefined}
        className="text-sm font-bold truncate flex-1"
        style={{ color: isFemale ? '#ec4899' : undefined }}
        isBusy={!!player?.id && busyPlayerIds?.has(player.id)}
        achievements={achievements}
        busyPlayerIds={busyPlayerIds}
        sessionMatchCounts={sessionMatchCounts}
      />
    </div>
  );
}

function ManagerCourtCard({
  match, isOrganiser, isSignedUp, currentPlayerProfileId, availablePlayers, onSwapPlayer, busyPlayerIds,
  sessionMatchCounts, courtNames, onCancelMatch, achievements,
  onCompleteMatch, onEndSet, defaultPointsToPlayTo = 21,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp?: boolean;
  currentPlayerProfileId?: number | null;
  availablePlayers: Player[];
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
  courtNames?: string[];
  onCancelMatch?: (matchId: number) => void;
  achievements?: PlayerAchievements;
  onCompleteMatch?: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet?: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  defaultPointsToPlayTo?: number;
}) {
  const courtLabel = match.courtNumber ? courtNames?.[match.courtNumber - 1] || `Court ${match.courtNumber}` : "Court";
  const isLive = !!match.startedAt;
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const sA = match.scoreA || 0;
  const sB = match.scoreB || 0;

  const renderPlayerSlot = (player: any, position: string) => (
    <ManagerPlayerSlot
      key={position}
      player={player}
      position={position}
      matchId={match.id}
      availablePlayers={availablePlayers}
      isOrganiser={isOrganiser}
      onSwapPlayer={onSwapPlayer}
      sessionMatchCounts={sessionMatchCounts}
      busyPlayerIds={busyPlayerIds}
      achievements={achievements}
    />
  );

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-slate-900/80 overflow-hidden transition-all",
        isLive
          ? "border-emerald-400/40 dark:border-emerald-400/25 shadow-sm"
          : "border-amber-300/50 dark:border-amber-400/25"
      )}
      data-testid={`manager-court-${match.id}`}
    >
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b",
        isLive
          ? "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04]"
          : "border-amber-200 dark:border-amber-400/15 bg-amber-50/60 dark:bg-amber-500/[0.05]"
      )}>
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{courtLabel}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30">Live</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{courtLabel}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">Warmup</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLive && <LiveTimer startedAt={match.startedAt!} />}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-black/30">
            <span className={cn("text-base font-black tabular-nums", scoreColorClass(sA, pointsTarget))}>{sA}</span>
            <span className="text-xs text-gray-400 dark:text-white/30 font-bold">-</span>
            <span className={cn("text-base font-black tabular-nums", scoreColorClass(sB, pointsTarget))}>{sB}</span>
          </div>
          {isOrganiser && onCancelMatch && (
            <button
              onClick={() => onCancelMatch(match.id)}
              className="p-1 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
              title="Cancel match"
              data-testid={`manager-cancel-${match.id}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-gray-500 dark:text-white/40">
            Team A
          </p>
          <div className="space-y-1">
            {renderPlayerSlot(match.teamAPlayer1, "teamAPlayer1Id")}
            {renderPlayerSlot(match.teamAPlayer2, "teamAPlayer2Id")}
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          <span className="text-[10px] font-bold text-gray-400 dark:text-white/25 uppercase tracking-widest">vs</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-gray-500 dark:text-white/40">
            Team B
          </p>
          <div className="space-y-1">
            {renderPlayerSlot(match.teamBPlayer1, "teamBPlayer1Id")}
            {renderPlayerSlot(match.teamBPlayer2, "teamBPlayer2Id")}
          </div>
        </div>
      </div>

      {onCompleteMatch && onEndSet && (
        <InlineScorePanel match={match} isOrganiser={isOrganiser} isSignedUp={!!isSignedUp}
          currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
          onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch} />
      )}
    </div>
  );
}

function EmptyCourtSlot({ courtNumber, courtName }: { courtNumber: number; courtName: string }) {
  const courtColor = getCourtColor(courtNumber);
  return (
    <div
      className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.015] shadow-inner flex flex-col items-center justify-center py-8 gap-2"
      data-testid={`empty-court-slot-${courtNumber}`}
    >
      <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: `${courtColor.ring}30` }}>
        <span className="text-sm font-black tabular-nums" style={{ color: `${courtColor.ring}50` }}>{courtNumber}</span>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: `${courtColor.ring}40` }}>{courtName}</span>
      <span className="text-[10px] text-gray-400 dark:text-white/20">No active match</span>
    </div>
  );
}

type ProLiveMatchesProps = {
  liveMatches: CourtMatch[];
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  availablePlayers: Player[];
  courtNames?: string[];
  totalCourts?: number;
  defaultPointsToPlayTo?: number;
  sessionMatchCounts?: Record<number, number>;
  achievements?: PlayerAchievements;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  onCourtNameChange?: (courtNumber: number, name: string) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  busyPlayerIds?: Set<number>;
};

export function ProLiveMatches({
  liveMatches, isOrganiser, isSignedUp, currentPlayerProfileId, availablePlayers,
  courtNames, totalCourts, defaultPointsToPlayTo = 21, sessionMatchCounts, achievements,
  onCompleteMatch, onEndSet, onCancelMatch, onSwapPlayer,
  busyPlayerIds,
}: ProLiveMatchesProps) {
  const [sectionLight, setSectionLight] = useState(false);

  const maxCourtFromMatches = liveMatches.reduce((max, m) => Math.max(max, m.courtNumber || 0), 0);
  const numCourts = Math.max(totalCourts || 0, courtNames?.length || 0, maxCourtFromMatches);
  const matchByCourtNumber = new Map<number, CourtMatch>();
  liveMatches.forEach(m => { if (m.courtNumber) matchByCourtNumber.set(m.courtNumber, m); });
  const courtSlots = Array.from({ length: numCourts }, (_, i) => ({
    courtNumber: i + 1,
    match: matchByCourtNumber.get(i + 1) || null,
    courtName: courtNames?.[i] || `Court ${i + 1}`,
  }));

  if (liveMatches.length === 0 && numCourts === 0) {
    return (
      <div className="relative rounded-[2rem] border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-slate-950/90 backdrop-blur-2xl p-8 overflow-hidden" data-testid="pro-live-matches-empty">
        <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }} />
        <div className="relative z-10 flex flex-col items-center justify-center py-8 gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center animate-spin" style={{ animationDuration: '12s' }}>
              <CircleDot className="w-6 h-6 text-gray-300 dark:text-white/15" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-white/30 font-medium">No live matches</p>
          <p className="text-xs text-gray-400 dark:text-white/15">Generate matches and assign them to courts</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-[2rem] border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-slate-950/90 backdrop-blur-2xl p-4 sm:p-6 overflow-hidden", sectionLight && "force-light-section")} data-testid="pro-live-matches">
      <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight" data-testid="pro-live-title">
              Live Courts
            </h3>
            <span className="text-xs font-mono text-gray-500 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">{liveMatches.length}</span>
            <button
              onClick={() => setSectionLight(prev => !prev)}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                sectionLight
                  ? "bg-amber-100 text-amber-600 shadow-sm"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.12]"
              )}
              title={sectionLight ? "Switch to dark" : "Switch to light"}
              data-testid="button-toggle-light-live"
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {courtSlots.map(slot => slot.match ? (
            <ManagerCourtCard
              key={`court-${slot.courtNumber}`}
              match={slot.match}
              isOrganiser={isOrganiser}
              isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId}
              availablePlayers={availablePlayers}
              onSwapPlayer={onSwapPlayer}
              busyPlayerIds={busyPlayerIds}
              sessionMatchCounts={sessionMatchCounts}
              courtNames={courtNames}
              onCancelMatch={onCancelMatch}
              achievements={achievements}
              onCompleteMatch={onCompleteMatch}
              onEndSet={onEndSet}
              defaultPointsToPlayTo={defaultPointsToPlayTo}
            />
          ) : (
            <EmptyCourtSlot key={`court-${slot.courtNumber}`} courtNumber={slot.courtNumber} courtName={slot.courtName} />
          ))}
        </div>
      </div>
    </div>
  );
}
