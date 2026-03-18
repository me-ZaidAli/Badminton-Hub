import { useState, useEffect, useCallback, useRef } from "react";
import { type CourtMatch } from "@/components/BadmintonCourt";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  List, LayoutGrid, Clock, Trophy, CheckCircle, XCircle,
  Swords, ChevronDown, ChevronLeft, ChevronRight, Pencil, Users, Target, Check, Minus, Plus,
  CircleDot, Hash, Monitor, Maximize2, X, Flame, Lightbulb
} from "lucide-react";

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
  open, onOpenChange, currentPlayer, availablePlayers, onSwap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer: { id: number; fullName: string; category: string | null } | null;
  availablePlayers: Player[];
  onSwap: (playerId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = availablePlayers.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Swap Player</DialogTitle>
          <DialogDescription>Select a player to replace the current one.</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search players..." value={search} onValueChange={setSearch} data-testid="input-pro-swap-search" />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((p) => (
                <CommandItem key={p.id} value={p.fullName} onSelect={() => { onSwap(p.id); onOpenChange(false); setSearch(""); }} data-testid={`pro-select-player-${p.id}`}>
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

export type PlayerAchievements = Record<number, { trophy?: boolean; fire?: boolean }>;

function PlayerAchievementIcons({ playerId, achievements }: { playerId?: number; achievements?: PlayerAchievements }) {
  if (!playerId || !achievements) return null;
  const a = achievements[playerId];
  if (!a) return null;
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5 align-middle">
      {a.trophy && <Trophy className="w-3 h-3 text-amber-400 inline-block" data-testid={`icon-trophy-${playerId}`} />}
      {a.fire && <Flame className="w-3 h-3 text-orange-400 inline-block" data-testid={`icon-fire-${playerId}`} />}
    </span>
  );
}

function ClickablePlayerName({
  player, matchId, position, availablePlayers, canSwap, onSwapPlayer, sessionMatchCount, showMatchCount, className, isBusy, style, achievements,
}: {
  player: { id: number; user?: { fullName?: string } | null; category?: string | null; matchesPlayed?: number | null } | null;
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
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = player?.user?.fullName || "Unknown";
  const nameWithCount = (
    <>
      {name}
      {showMatchCount && sessionMatchCount != null && (
        <span className="text-gray-400 dark:text-white/30 font-normal text-[10px]"> ({sessionMatchCount})</span>
      )}
      <PlayerAchievementIcons playerId={player?.id} achievements={achievements} />
    </>
  );
  const busyClass = isBusy ? "text-red-400 animate-pulse" : "";
  if (!canSwap || !onSwapPlayer) return <span className={cn(className, busyClass)} style={style}>{nameWithCount}</span>;
  return (
    <>
      <span role="button" tabIndex={0} className={cn(className, busyClass, "cursor-pointer hover:underline hover:text-amber-400 active:text-amber-300 transition-colors")}
        style={style}
        onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); } }}
        data-testid={`pro-swap-${position}-${matchId}`}
      >{nameWithCount}<Pencil className="w-2 h-2 opacity-30 inline ml-0.5 align-middle shrink-0 hidden sm:inline" /></span>
      <SwapPlayerDialog open={dialogOpen} onOpenChange={setDialogOpen}
        currentPlayer={player ? { id: player.id, fullName: name, category: player.category || null } : null}
        availablePlayers={availablePlayers} onSwap={(newPlayerId) => onSwapPlayer(matchId, position, newPlayerId)} />
    </>
  );
}

type LiveMatchRowProps = {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  availablePlayers: Player[];
  courtName?: string;
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

function LiveMatchRow({
  match, isOrganiser, isSignedUp, currentPlayerProfileId, availablePlayers,
  courtName, defaultPointsToPlayTo = 21, sessionMatchCounts, achievements,
  onCompleteMatch, onEndSet, onCancelMatch, onSwapPlayer,
  onCourtNameChange, onUpdatePointsTarget, onUpdateSets, busyPlayerIds,
}: LiveMatchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [editingCourtName, setEditingCourtName] = useState(false);
  const [editCourtNameValue, setEditCourtNameValue] = useState(courtName || "");
  const [editingPoints, setEditingPoints] = useState(false);
  const courtNameInputRef = useRef<HTMLInputElement>(null);

  const matchSets = match.numberOfSets || 1;
  const isMultiSet = matchSets > 1;
  const currentSet = match.currentSet || 1;
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const displayCourtName = courtName || (match.courtNumber ? `Court ${match.courtNumber}` : "Court");
  const courtColor = getCourtColor(match.courtNumber || 1);

  useEffect(() => {
    setEditCourtNameValue(courtName || (match.courtNumber ? `Court ${match.courtNumber}` : ""));
  }, [courtName, match.courtNumber]);

  useEffect(() => {
    if (editingCourtName && courtNameInputRef.current) {
      courtNameInputRef.current.focus();
      courtNameInputRef.current.select();
    }
  }, [editingCourtName]);

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );

  const canInteract = isOrganiser || (isSignedUp && isPlayerInMatch);
  const canSwapPlayers = isOrganiser;

  const handleCourtNameSave = () => {
    const trimmed = editCourtNameValue.trim();
    if (trimmed && match.courtNumber && onCourtNameChange) onCourtNameChange(match.courtNumber, trimmed);
    setEditingCourtName(false);
  };

  const handlePointsSave = (val: number) => {
    if (!isNaN(val) && val >= 1 && val !== pointsTarget && onUpdatePointsTarget) onUpdatePointsTarget(match.id, val);
    setEditingPoints(false);
  };

  const resetForm = () => { setStep("input"); setScoreA(""); setScoreB(""); };

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
      setTimeout(() => { setExpanded(false); resetForm(); }, 1500);
    } catch { setStep("input"); } finally { setSubmitting(false); }
  }, [scoreA, scoreB, step, isMultiSet, currentSet, match.id, onCompleteMatch, onEndSet]);

  const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);

  return (
    <div
      className="pro-live-row group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.07] transition-all duration-300 hover:border-gray-300 dark:hover:border-white/[0.12] bg-white dark:bg-slate-900/95"
      data-testid={`pro-live-match-${match.id}`}
    >
      <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")' }} />

      <div
        role="button"
        tabIndex={canInteract ? 0 : -1}
        aria-expanded={expanded}
        className={cn("relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 px-5 py-5 select-none", canInteract ? "cursor-pointer" : "cursor-default")}
        onClick={() => { if (canInteract) { setExpanded(!expanded); if (expanded) resetForm(); } }}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && canInteract) { e.preventDefault(); setExpanded(!expanded); } }}
        data-testid={`pro-live-toggle-${match.id}`}
      >
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ backgroundColor: courtColor.ring }} />
            <span className="relative flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: courtColor.ring, boxShadow: `0 0 8px ${courtColor.glow}` }} />
          </div>
          {editingCourtName && isOrganiser ? (
            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <input ref={courtNameInputRef} type="text" value={editCourtNameValue}
                onChange={(e) => setEditCourtNameValue(e.target.value)}
                onBlur={handleCourtNameSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleCourtNameSave(); if (e.key === "Escape") { setEditCourtNameValue(displayCourtName); setEditingCourtName(false); } }}
                className="w-24 text-xs px-2 py-0.5 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white outline-none"
                data-testid={`input-pro-court-name-${match.courtNumber}`}
              />
            </div>
          ) : (
            <span
              className={cn("text-xs font-bold uppercase tracking-widest", isOrganiser && "cursor-pointer hover:underline")}
              style={{ color: courtColor.ring }}
              onClick={(e) => { if (isOrganiser) { e.stopPropagation(); setEditingCourtName(true); } }}
              data-testid={`pro-court-label-${match.courtNumber}`}
            >
              {displayCourtName}
              {isOrganiser && <Pencil className="w-2.5 h-2.5 ml-1 inline-block opacity-50" />}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-400/5" data-testid={`pro-live-badge-${match.id}`}>LIVE</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: courtColor.bg, color: courtColor.ring }}>A</span>
            <ClickablePlayerName player={match.teamAPlayer1} matchId={match.id} position="teamAPlayer1Id"
              availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1?.id]}
              className="text-sm sm:text-base font-bold text-emerald-700 dark:text-white" isBusy={!!match.teamAPlayer1?.id && busyPlayerIds?.has(match.teamAPlayer1.id)} achievements={achievements} />
            {match.teamAPlayer2 && (
              <>
                <span className="text-gray-300 dark:text-white/20 text-xs">&</span>
                <ClickablePlayerName player={match.teamAPlayer2} matchId={match.id} position="teamAPlayer2Id"
                  availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
                  showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2?.id]}
                  className="text-sm sm:text-base font-bold text-emerald-700 dark:text-white" isBusy={!!match.teamAPlayer2?.id && busyPlayerIds?.has(match.teamAPlayer2.id)} achievements={achievements} />
              </>
            )}
          </div>
          <span className="text-gray-300 dark:text-white/20 text-[10px] font-bold uppercase tracking-widest shrink-0">vs</span>
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 shrink-0">B</span>
            <ClickablePlayerName player={match.teamBPlayer1} matchId={match.id} position="teamBPlayer1Id"
              availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1?.id]}
              className="text-sm sm:text-base font-bold text-blue-600 dark:text-white/80" isBusy={!!match.teamBPlayer1?.id && busyPlayerIds?.has(match.teamBPlayer1.id)} achievements={achievements} />
            {match.teamBPlayer2 && (
              <>
                <span className="text-gray-300 dark:text-white/20 text-xs">&</span>
                <ClickablePlayerName player={match.teamBPlayer2} matchId={match.id} position="teamBPlayer2Id"
                  availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
                  showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2?.id]}
                  className="text-sm sm:text-base font-bold text-blue-600 dark:text-white/80" isBusy={!!match.teamBPlayer2?.id && busyPlayerIds?.has(match.teamBPlayer2.id)} achievements={achievements} />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isMultiSet && match.setScores && match.setScores.length > 0 && (
            <div className="flex gap-1">
              {match.setScores.map((s, i) => (
                <span key={i} className="text-[10px] font-mono text-gray-500 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">{s.scoreA}-{s.scoreB}</span>
              ))}
            </div>
          )}

          {(isOrganiser) && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              {editingPoints ? (
                <input type="number" min="1" className="w-12 border border-gray-200 dark:border-white/10 rounded px-1 py-0 text-[10px] bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-center outline-none"
                  defaultValue={pointsTarget} autoFocus
                  onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10)); if (e.key === "Escape") setEditingPoints(false); }}
                  data-testid={`input-pro-points-${match.id}`} />
              ) : (
                <span className="text-[10px] text-gray-400 dark:text-white/30 font-mono cursor-pointer hover:text-gray-600 dark:hover:text-white/50 transition-colors"
                  onClick={() => setEditingPoints(true)} data-testid={`pro-points-${match.id}`}>
                  <Target className="w-2.5 h-2.5 inline mr-0.5" />{pointsTarget}
                </span>
              )}
              {onUpdateSets && (
                <Select value={String(matchSets)} onValueChange={(v) => onUpdateSets?.(match.id, Number(v))}>
                  <SelectTrigger className="h-5 w-auto min-w-0 gap-0.5 px-1.5 text-[9px] bg-transparent border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30" data-testid={`select-pro-sets-${match.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" data-testid={`pro-sets-option-1-${match.id}`}>1 Set</SelectItem>
                    <SelectItem value="2" data-testid={`pro-sets-option-2-${match.id}`}>2 Sets</SelectItem>
                    <SelectItem value="3" data-testid={`pro-sets-option-3-${match.id}`}>Bo3</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {match.startedAt && <LiveTimer startedAt={match.startedAt} />}

          {canInteract && (
            <ChevronDown className={cn("w-4 h-4 text-gray-400 dark:text-white/30 transition-transform duration-300", expanded && "rotate-180")} />
          )}
        </div>
      </div>

      <div ref={contentRef} className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: expanded ? contentRef.current?.scrollHeight ? `${contentRef.current.scrollHeight + 20}px` : "400px" : "0px",
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div className="relative z-10 px-5 pb-5 pt-1 border-t border-gray-100 dark:border-white/[0.05]">
          {step === "success" ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Score Saved</span>
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-4 pt-3">
              <p className="text-xs text-gray-500 dark:text-white/40 text-center">Confirm {isMultiSet ? `Set ${currentSet}` : "final"} result</p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Team A</p>
                  <div className={cn("text-3xl font-bold font-mono tabular-nums", parseInt(scoreA) > parseInt(scoreB) ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-white/60")} style={{ fontFamily: "'Orbitron', monospace" }}>{scoreA}</div>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1 truncate max-w-[120px]">{teamANames.join(" & ")}</p>
                </div>
                <Swords className="w-5 h-5 text-gray-300 dark:text-white/20" />
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Team B</p>
                  <div className={cn("text-3xl font-bold font-mono tabular-nums", parseInt(scoreB) > parseInt(scoreA) ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-white/60")} style={{ fontFamily: "'Orbitron', monospace" }}>{scoreB}</div>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1 truncate max-w-[120px]">{teamBNames.join(" & ")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 text-sm font-medium rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all duration-300"
                  onClick={(e) => { e.stopPropagation(); setStep("input"); }} data-testid={`pro-match-back-${match.id}`}>Back</button>
                <button className="flex-1 px-4 py-2 text-sm font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 active:scale-95 transition-all duration-300"
                  onClick={(e) => { e.stopPropagation(); handleSubmitScore(); }} disabled={submitting} data-testid={`pro-match-confirm-${match.id}`}>
                  {submitting ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5 block font-bold">Team A</label>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mb-2 truncate">{teamANames.join(" & ") || "Team A"}</p>
                  <div className="flex items-center gap-2">
                    <button className="w-10 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreA(String(Math.max(0, (parseInt(scoreA) || 0) - 1))); }} data-testid={`pro-score-a-minus-${match.id}`}>
                      <Minus className="w-4 h-4" />
                    </button>
                    <Input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-gray-50 dark:bg-slate-800/80 border-emerald-500/20 text-gray-900 dark:text-white text-center text-xl font-mono h-11 focus:border-emerald-400/40 focus:ring-emerald-400/20"
                      style={{ fontFamily: "'Orbitron', monospace" }}
                      placeholder="0" data-testid={`pro-score-a-${match.id}`} />
                    <button className="w-10 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreA(String((parseInt(scoreA) || 0) + 1)); }} data-testid={`pro-score-a-plus-${match.id}`}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-gray-300 dark:text-white/15 font-bold text-sm mt-8">vs</div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1.5 block font-bold">Team B</label>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mb-2 truncate">{teamBNames.join(" & ") || "Team B"}</p>
                  <div className="flex items-center gap-2">
                    <button className="w-10 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreB(String(Math.max(0, (parseInt(scoreB) || 0) - 1))); }} data-testid={`pro-score-b-minus-${match.id}`}>
                      <Minus className="w-4 h-4" />
                    </button>
                    <Input type="number" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-gray-50 dark:bg-slate-800/80 border-blue-500/20 text-gray-900 dark:text-white text-center text-xl font-mono h-11 focus:border-blue-400/40 focus:ring-blue-400/20"
                      style={{ fontFamily: "'Orbitron', monospace" }}
                      placeholder="0" data-testid={`pro-score-b-${match.id}`} />
                    <button className="w-10 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreB(String((parseInt(scoreB) || 0) + 1)); }} data-testid={`pro-score-b-plus-${match.id}`}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {scoreA && scoreB && scoreA === scoreB && (
                <p className="text-[11px] text-red-400 text-center">Scores cannot be tied</p>
              )}
              <div className="flex gap-3 pt-1">
                {isOrganiser && onCancelMatch && (
                  <button className="px-5 py-2.5 text-sm font-medium rounded-full border border-red-500/20 text-red-400/80 bg-red-500/5 hover:bg-red-500/10 active:scale-95 transition-all duration-300"
                    onClick={(e) => { e.stopPropagation(); onCancelMatch(match.id); }} data-testid={`pro-match-cancel-${match.id}`}>
                    <XCircle className="w-4 h-4 mr-1.5 inline" />Cancel
                  </button>
                )}
                <button className="flex-1 px-5 py-3 text-sm font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 animate-pulse active:scale-95 transition-all duration-300"
                  style={{ animationDuration: '3s' }}
                  onClick={(e) => { e.stopPropagation(); handleSubmitScore(); }}
                  disabled={!scoreA || !scoreB || scoreA === scoreB || submitting}
                  data-testid={`pro-match-end-${match.id}`}>
                  <Trophy className="w-4 h-4 mr-1.5 inline" />
                  {isMultiSet ? `End Set ${currentSet}` : "End Match"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CourtViewPlayerLabel({ name, playerId, sessionMatchCounts, achievements }: { name: string; playerId?: number; sessionMatchCounts?: Record<number, number>; achievements?: PlayerAchievements }) {
  const count = playerId ? sessionMatchCounts?.[playerId] : undefined;
  return (
    <>
      {name}
      {count != null && <span className="opacity-50 font-normal text-[9px]"> ({count})</span>}
      {playerId && achievements && <PlayerAchievementIcons playerId={playerId} achievements={achievements} />}
    </>
  );
}

function CourtView({ match, sessionMatchCounts, achievements, isOrganiser, availablePlayers, onSwapPlayer, busyPlayerIds }: {
  match: CourtMatch; sessionMatchCounts?: Record<number, number>; achievements?: PlayerAchievements;
  isOrganiser?: boolean; availablePlayers?: Player[]; onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void; busyPlayerIds?: Set<number>;
}) {
  const courtColor = getCourtColor(match.courtNumber || 1);
  const canSwap = !!isOrganiser && !!onSwapPlayer;

  const labelCls = "px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border text-xs sm:text-sm font-semibold truncate block";
  const fontCls = "text-xs sm:text-sm font-semibold";
  return (
    <div className="relative w-full aspect-[2/1.2] pro-court-aspect rounded-xl overflow-hidden border border-white/[0.07]" data-testid={`pro-court-view-${match.id}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/40 via-emerald-800/30 to-emerald-900/40" />
      <div className="absolute inset-[6%] border-2 border-white/40 rounded-sm" />
      <div className="absolute left-1/2 top-[6%] bottom-[6%] w-0.5 bg-white/30" style={{ transform: 'translateX(-50%)' }} />
      <div className="absolute top-[6%] left-[6%] right-[6%] h-0 border-t-2 border-white/40" />
      <div className="absolute bottom-[6%] left-[6%] right-[6%] h-0 border-b-2 border-white/40" />
      <div className="absolute left-[6%] right-1/2 top-[30%] bottom-[30%] border border-white/20" />
      <div className="absolute right-[6%] left-1/2 top-[30%] bottom-[30%] border border-white/20" />

      <div className="absolute left-[3%] right-[54%] top-[10%] sm:top-[16%] z-10">
        <div className={labelCls} style={{ borderColor: courtColor.ring + '40', color: courtColor.ring }} data-testid={`pro-court-player-a1-${match.id}`}>
          <ClickablePlayerName player={match.teamAPlayer1} matchId={match.id} position="teamAPlayer1Id"
            availablePlayers={availablePlayers || []} canSwap={canSwap} onSwapPlayer={onSwapPlayer}
            showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1?.id]}
            className={fontCls} style={{ color: courtColor.ring }}
            isBusy={!!match.teamAPlayer1?.id && busyPlayerIds?.has(match.teamAPlayer1.id)} achievements={achievements} />
        </div>
      </div>
      {match.teamAPlayer2 && (
        <div className="absolute left-[3%] right-[54%] bottom-[10%] sm:bottom-[16%] z-10">
          <div className={labelCls} style={{ borderColor: courtColor.ring + '40', color: courtColor.ring }} data-testid={`pro-court-player-a2-${match.id}`}>
            <ClickablePlayerName player={match.teamAPlayer2} matchId={match.id} position="teamAPlayer2Id"
              availablePlayers={availablePlayers || []} canSwap={canSwap} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2?.id]}
              className={fontCls} style={{ color: courtColor.ring }}
              isBusy={!!match.teamAPlayer2?.id && busyPlayerIds?.has(match.teamAPlayer2.id)} achievements={achievements} />
          </div>
        </div>
      )}

      <div className="absolute left-[54%] right-[3%] top-[10%] sm:top-[16%] z-10 flex justify-end">
        <div className={cn(labelCls, "border-blue-400/30 text-blue-400")} data-testid={`pro-court-player-b1-${match.id}`}>
          <ClickablePlayerName player={match.teamBPlayer1} matchId={match.id} position="teamBPlayer1Id"
            availablePlayers={availablePlayers || []} canSwap={canSwap} onSwapPlayer={onSwapPlayer}
            showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1?.id]}
            className={cn(fontCls, "text-blue-400")}
            isBusy={!!match.teamBPlayer1?.id && busyPlayerIds?.has(match.teamBPlayer1.id)} achievements={achievements} />
        </div>
      </div>
      {match.teamBPlayer2 && (
        <div className="absolute left-[54%] right-[3%] bottom-[10%] sm:bottom-[16%] z-10 flex justify-end">
          <div className={cn(labelCls, "border-blue-400/30 text-blue-400")} data-testid={`pro-court-player-b2-${match.id}`}>
            <ClickablePlayerName player={match.teamBPlayer2} matchId={match.id} position="teamBPlayer2Id"
              availablePlayers={availablePlayers || []} canSwap={canSwap} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2?.id]}
              className={cn(fontCls, "text-blue-400")}
              isBusy={!!match.teamBPlayer2?.id && busyPlayerIds?.has(match.teamBPlayer2.id)} achievements={achievements} />
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-sm border border-white/10">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: courtColor.ring }}>
            {match.courtNumber ? `C${match.courtNumber}` : ""}
          </span>
          {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
        </div>
      </div>
    </div>
  );
}

function CourtCard({
  match, isOrganiser, isSignedUp, currentPlayerProfileId, courtNames, defaultPointsToPlayTo = 21,
  onCompleteMatch, onEndSet, onCancelMatch, onUpdatePointsTarget, onUpdateSets,
  onSwapPlayer, availablePlayers, busyPlayerIds, sessionMatchCounts, achievements,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  courtNames?: string[];
  defaultPointsToPlayTo?: number;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  availablePlayers?: Player[];
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
  achievements?: PlayerAchievements;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const courtColor = getCourtColor(match.courtNumber || 1);
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const matchSets = match.numberOfSets || 1;

  const handlePointsSave = (val: number) => {
    if (!isNaN(val) && val >= 1 && val !== pointsTarget && onUpdatePointsTarget) onUpdatePointsTarget(match.id, val);
    setEditingPoints(false);
  };
  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );
  const canInteract = isOrganiser || (isSignedUp && isPlayerInMatch);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 court-card-header">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: courtColor.ring }} />
        <span className="text-xs font-bold text-gray-500 dark:text-white/60 uppercase tracking-wider">
          {match.courtNumber ? courtNames?.[match.courtNumber - 1] || `Court ${match.courtNumber}` : "Court"}
        </span>
        <div className="flex-1" />
        {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
      </div>
      <div className="px-3 pb-1 court-card-court-wrap">
        <CourtView match={match} sessionMatchCounts={sessionMatchCounts} achievements={achievements}
          isOrganiser={isOrganiser} availablePlayers={availablePlayers} onSwapPlayer={onSwapPlayer} busyPlayerIds={busyPlayerIds} />
      </div>
      {isOrganiser && (
        <div className="px-4 pb-2 court-card-controls">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Target className="w-3 h-3 text-gray-400 dark:text-white/25" />
              {editingPoints ? (
                <input
                  type="number"
                  min="1"
                  className="w-12 border border-gray-200 dark:border-white/15 rounded px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  defaultValue={pointsTarget}
                  autoFocus
                  onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10)); if (e.key === "Escape") setEditingPoints(false); }}
                  data-testid={`input-court-points-${match.id}`}
                />
              ) : (
                <span
                  className="text-xs text-gray-400 dark:text-white/35 font-mono cursor-pointer transition-colors"
                  onClick={() => setEditingPoints(true)}
                  data-testid={`court-points-${match.id}`}
                >
                  Play to {pointsTarget}
                </span>
              )}
            </div>
            {onUpdateSets && (
              <div onClick={(e) => e.stopPropagation()}>
                <Select value={String(matchSets)} onValueChange={(v) => onUpdateSets?.(match.id, Number(v))}>
                  <SelectTrigger
                    className="h-6 w-auto min-w-0 gap-0.5 px-2 text-[10px] bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/35 rounded-full"
                    data-testid={`select-court-sets-${match.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" data-testid={`court-sets-option-1-${match.id}`}>1 Set</SelectItem>
                    <SelectItem value="2" data-testid={`court-sets-option-2-${match.id}`}>2 Sets</SelectItem>
                    <SelectItem value="3" data-testid={`court-sets-option-3-${match.id}`}>Bo3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
      {canInteract && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-2.5 court-card-expand border-t border-gray-100 dark:border-white/[0.05] text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-all duration-300 active:scale-[0.98]"
            data-testid={`pro-court-expand-${match.id}`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">{expanded ? "Hide Controls" : "Score & End Match"}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <InlineScorePanel match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
              onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch} />
          )}
        </>
      )}
    </div>
  );
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
  const courtColor = getCourtColor(match.courtNumber || 1);

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

  const resetForm = () => { setStep("input"); setScoreA(""); setScoreB(""); };

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
      <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100 dark:border-white/[0.05]">
        <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
        <span className="text-xs font-semibold text-gray-900 dark:text-white">Score Saved</span>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] text-gray-500 dark:text-white/40 text-center">Confirm {isMultiSet ? `Set ${currentSet}` : "final"} result</p>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-[9px] text-gray-400 dark:text-white/30 mb-0.5 truncate max-w-[90px]">{teamANames.join(" & ")}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: courtColor.ring }}>Team A</p>
            <div className={cn("text-2xl font-bold font-mono tabular-nums", parseInt(scoreA) > parseInt(scoreB) ? "text-emerald-600 dark:text-white" : "text-gray-400 dark:text-white/60")} style={{ fontFamily: "'Orbitron', monospace", ...(parseInt(scoreA) > parseInt(scoreB) ? { color: courtColor.ring } : {}) }}>{scoreA}</div>
          </div>
          <Swords className="w-4 h-4 text-gray-300 dark:text-white/20" />
          <div className="text-center">
            <p className="text-[9px] text-gray-400 dark:text-white/30 mb-0.5 truncate max-w-[90px]">{teamBNames.join(" & ")}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Team B</p>
            <div className={cn("text-2xl font-bold font-mono tabular-nums", parseInt(scoreB) > parseInt(scoreA) ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-white/60")} style={{ fontFamily: "'Orbitron', monospace" }}>{scoreB}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 text-xs font-medium rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all duration-300"
            onClick={() => setStep("input")} data-testid={`pro-inline-back-${match.id}`}>Back</button>
          <button className="flex-1 px-3 py-2 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 active:scale-95 transition-all duration-300"
            onClick={handleSubmitScore} disabled={submitting} data-testid={`pro-inline-confirm-${match.id}`}>
            {submitting ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-4 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-gray-400 dark:text-white/40 truncate mb-0.5">{teamANames.join(" & ")}</p>
          <label className="text-[9px] uppercase tracking-widest mb-1 block font-bold" style={{ color: courtColor.ring }}>Team A</label>
          <div className="flex items-center gap-1">
            <button className="w-8 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
              onClick={() => setScoreA(String(Math.max(0, (parseInt(scoreA) || 0) - 1)))} data-testid={`pro-inline-a-minus-${match.id}`}>
              <Minus className="w-3 h-3" />
            </button>
            <Input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)}
              className="bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-white text-center text-lg font-mono h-9 focus:ring-emerald-400/20"
              style={{ fontFamily: "'Orbitron', monospace", borderColor: courtColor.ring + '30' }}
              placeholder="0" data-testid={`pro-inline-a-score-${match.id}`} />
            <button className="w-8 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
              onClick={() => setScoreA(String((parseInt(scoreA) || 0) + 1))} data-testid={`pro-inline-a-plus-${match.id}`}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="text-gray-300 dark:text-white/15 font-bold text-xs mt-4">vs</div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-gray-400 dark:text-white/40 truncate mb-0.5">{teamBNames.join(" & ")}</p>
          <label className="text-[9px] uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1 block font-bold">Team B</label>
          <div className="flex items-center gap-1">
            <button className="w-8 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
              onClick={() => setScoreB(String(Math.max(0, (parseInt(scoreB) || 0) - 1)))} data-testid={`pro-inline-b-minus-${match.id}`}>
              <Minus className="w-3 h-3" />
            </button>
            <Input type="number" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)}
              className="bg-gray-50 dark:bg-slate-800/80 border-blue-500/20 text-gray-900 dark:text-white text-center text-lg font-mono h-9 focus:border-blue-400/40 focus:ring-blue-400/20"
              style={{ fontFamily: "'Orbitron', monospace" }}
              placeholder="0" data-testid={`pro-inline-b-score-${match.id}`} />
            <button className="w-8 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
              onClick={() => setScoreB(String((parseInt(scoreB) || 0) + 1))} data-testid={`pro-inline-b-plus-${match.id}`}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {scoreA && scoreB && scoreA === scoreB && (
        <p className="text-[10px] text-red-400 text-center">Scores cannot be tied</p>
      )}
      <div className="flex gap-2">
        {isOrganiser && onCancelMatch && (
          <button className="px-3 py-2 text-xs font-medium rounded-full border border-red-500/20 text-red-400/80 bg-red-500/5 hover:bg-red-500/10 active:scale-95 transition-all duration-300"
            onClick={() => onCancelMatch(match.id)} data-testid={`pro-inline-cancel-${match.id}`}>
            <XCircle className="w-3 h-3 mr-1 inline" />Cancel
          </button>
        )}
        <button className="flex-1 px-3 py-2.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 animate-pulse active:scale-95 transition-all duration-300"
          style={{ animationDuration: '3s' }}
          onClick={handleSubmitScore}
          disabled={!scoreA || !scoreB || scoreA === scoreB || submitting}
          data-testid={`pro-inline-end-${match.id}`}>
          <Trophy className="w-3 h-3 mr-1 inline" />
          {isMultiSet ? `End Set ${currentSet}` : "End Match"}
        </button>
      </div>
    </div>
  );
}

function BroadcastTimer({ startedAt }: { startedAt: string }) {
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
    <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums" style={{ textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

function BroadcastCard({
  match, isOrganiser, isSignedUp, currentPlayerProfileId, defaultPointsToPlayTo = 21,
  onCompleteMatch, onEndSet, onCancelMatch, onUpdatePointsTarget, onUpdateSets,
  onSwapPlayer, availablePlayers, busyPlayerIds, sessionMatchCounts, achievements,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  defaultPointsToPlayTo?: number;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  availablePlayers?: Player[];
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
  achievements?: PlayerAchievements;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const courtColor = getCourtColor(match.courtNumber || 1);
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const matchSets = match.numberOfSets || 1;

  const handlePointsSave = (val: number) => {
    if (!isNaN(val) && val >= 1 && val !== pointsTarget && onUpdatePointsTarget) onUpdatePointsTarget(match.id, val);
    setEditingPoints(false);
  };

  const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);
  const teamALabel = teamANames.length > 0 ? teamANames.join(" & ") : "TEAM A";
  const teamBLabel = teamBNames.length > 0 ? teamBNames.join(" & ") : "TEAM B";

  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const setsWonA = match.setsWonA || 0;
  const setsWonB = match.setsWonB || 0;
  const totalSets = match.numberOfSets || 1;
  const isMultiSet = totalSets > 1;
  const currentSet = match.currentSet || 1;

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );
  const canInteract = isOrganiser || (isSignedUp && isPlayerInMatch);

  const gameIndicatorsA = Array.from({ length: totalSets > 1 ? totalSets : 3 }, (_, i) => i < setsWonA);
  const gameIndicatorsB = Array.from({ length: totalSets > 1 ? totalSets : 3 }, (_, i) => i < setsWonB);

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.07]" data-testid={`pro-broadcast-${match.id}`}>
      <div className="relative" style={{ background: 'linear-gradient(135deg, #0c1a0c 0%, #0a1e1e 30%, #0d1a0d 60%, #0a1a10 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px), repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px)' }} />

        <div className="relative z-10 px-4 sm:px-6 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ backgroundColor: `${courtColor.ring}20`, border: `2px solid ${courtColor.ring}40`, color: courtColor.ring }}>
                A
              </div>
              <div className="min-w-0">
                <div className="flex gap-0.5 mb-0.5">
                  {gameIndicatorsA.map((won, i) => (
                    <div key={i} className="w-5 h-1.5 rounded-sm transition-all" style={{ backgroundColor: won ? courtColor.ring : 'rgba(255,255,255,0.08)' }} />
                  ))}
                </div>
                <span className="text-base sm:text-lg font-black uppercase tracking-wide truncate block" style={{ color: courtColor.ring }} data-testid={`broadcast-team-a-${match.id}`}>{teamALabel}</span>
                <div className="flex flex-col">
                  {match.teamAPlayer1 && (
                    <ClickablePlayerName player={match.teamAPlayer1} matchId={match.id} position="teamAPlayer1Id"
                      availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                      showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1.id]}
                      className="text-xs sm:text-sm font-medium truncate block" isBusy={busyPlayerIds?.has(match.teamAPlayer1.id)}
                      style={{ color: `${courtColor.ring}cc` }} achievements={achievements} />
                  )}
                  {match.teamAPlayer2 && (
                    <ClickablePlayerName player={match.teamAPlayer2} matchId={match.id} position="teamAPlayer2Id"
                      availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                      showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2.id]}
                      className="text-xs sm:text-sm font-medium truncate block" isBusy={busyPlayerIds?.has(match.teamAPlayer2.id)}
                      style={{ color: `${courtColor.ring}cc` }} achievements={achievements} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center px-2 sm:px-4 shrink-0">
              {match.startedAt ? <BroadcastTimer startedAt={match.startedAt} /> : (
                <span className="font-mono text-3xl sm:text-4xl font-black text-white/30 tabular-nums">00:00</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="flex gap-0.5 justify-end mb-0.5">
                  {gameIndicatorsB.map((won, i) => (
                    <div key={i} className="w-5 h-1.5 rounded-sm transition-all" style={{ backgroundColor: won ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.08)' }} />
                  ))}
                </div>
                <span className="text-base sm:text-lg font-black uppercase tracking-wide truncate block text-blue-400" data-testid={`broadcast-team-b-${match.id}`}>{teamBLabel}</span>
                <div className="flex flex-col items-end">
                  {match.teamBPlayer1 && (
                    <ClickablePlayerName player={match.teamBPlayer1} matchId={match.id} position="teamBPlayer1Id"
                      availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                      showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1.id]}
                      className="text-xs sm:text-sm font-medium text-blue-400/80 truncate block text-right" isBusy={busyPlayerIds?.has(match.teamBPlayer1.id)} achievements={achievements} />
                  )}
                  {match.teamBPlayer2 && (
                    <ClickablePlayerName player={match.teamBPlayer2} matchId={match.id} position="teamBPlayer2Id"
                      availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                      showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2.id]}
                      className="text-xs sm:text-sm font-medium text-blue-400/80 truncate block text-right" isBusy={busyPlayerIds?.has(match.teamBPlayer2.id)} achievements={achievements} />
                  )}
                </div>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-blue-400/20 border-2 border-blue-400/40 text-blue-400">
                B
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 sm:px-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center justify-start">
              <span className="font-mono font-black tabular-nums leading-none text-5xl sm:text-7xl" style={{ color: courtColor.ring, textShadow: `0 0 30px ${courtColor.glow}, 0 4px 20px rgba(0,0,0,0.5)` }} data-testid={`broadcast-score-a-${match.id}`}>{scoreA}</span>
            </div>

            <div className="flex flex-col items-center px-3 sm:px-5 shrink-0">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] flex flex-col items-center justify-center" style={{ borderColor: `${courtColor.ring}40`, background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.95) 0%, rgba(240,240,240,0.9) 100%)', boxShadow: `0 0 20px ${courtColor.ring}15, inset 0 2px 4px rgba(255,255,255,0.5)` }}>
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Game</span>
                <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none tabular-nums" data-testid={`broadcast-game-${match.id}`}>{isMultiSet ? currentSet : 1}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center">
                  <svg width="8" height="10" viewBox="0 0 8 10" className="rotate-180" style={{ color: scoreA > scoreB ? courtColor.ring : 'rgba(255,255,255,0.1)' }}><path d="M0 10L4 0L8 10H0Z" fill="currentColor" /></svg>
                </div>
                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">lead</span>
                <div className="flex items-center">
                  <svg width="8" height="10" viewBox="0 0 8 10" className="rotate-180" style={{ color: scoreB > scoreA ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.1)' }}><path d="M0 10L4 0L8 10H0Z" fill="currentColor" /></svg>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-end">
              <span className="font-mono font-black tabular-nums leading-none text-5xl sm:text-7xl text-blue-400" style={{ textShadow: '0 0 30px rgba(96,165,250,0.4), 0 4px 20px rgba(0,0,0,0.5)' }} data-testid={`broadcast-score-b-${match.id}`}>{scoreB}</span>
            </div>
          </div>
        </div>

        {isOrganiser && (
          <div className="relative z-10 px-4 sm:px-6 pb-2">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Target className="w-3 h-3 text-white/25" />
                {editingPoints ? (
                  <input
                    type="number"
                    min="1"
                    className="w-12 border border-white/15 rounded px-1.5 py-0.5 text-xs bg-white/[0.06] text-white text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    defaultValue={pointsTarget}
                    autoFocus
                    onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10)); if (e.key === "Escape") setEditingPoints(false); }}
                    data-testid={`input-broadcast-points-${match.id}`}
                  />
                ) : (
                  <span
                    className="text-xs text-white/35 font-mono cursor-pointer transition-colors"
                    onClick={() => setEditingPoints(true)}
                    data-testid={`broadcast-points-${match.id}`}
                  >
                    Play to {pointsTarget}
                  </span>
                )}
              </div>
              {onUpdateSets && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select value={String(matchSets)} onValueChange={(v) => onUpdateSets?.(match.id, Number(v))}>
                    <SelectTrigger
                      className="h-6 w-auto min-w-0 gap-0.5 px-2 text-[10px] bg-white/[0.04] border-white/10 text-white/35 rounded-full"
                      data-testid={`select-broadcast-sets-${match.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" data-testid={`broadcast-sets-option-1-${match.id}`}>1 Set</SelectItem>
                      <SelectItem value="2" data-testid={`broadcast-sets-option-2-${match.id}`}>2 Sets</SelectItem>
                      <SelectItem value="3" data-testid={`broadcast-sets-option-3-${match.id}`}>Bo3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {isMultiSet && match.setScores && match.setScores.length > 0 && (
          <div className="relative z-10 px-4 sm:px-6 pb-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {match.setScores.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04]">
                  <span className="text-[9px] text-white/30 font-semibold">G{i + 1}</span>
                  <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: s.scoreA > s.scoreB ? courtColor.ring : 'rgba(255,255,255,0.4)' }}>{s.scoreA}</span>
                  <span className="text-[9px] text-white/20">-</span>
                  <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: s.scoreB > s.scoreA ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.4)' }}>{s.scoreB}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {canInteract && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 dark:bg-white/[0.03] border-t border-gray-100 dark:border-white/[0.05] text-gray-400 dark:text-white/40 transition-all duration-300 hover-elevate"
            data-testid={`pro-broadcast-expand-${match.id}`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">{expanded ? "Hide Controls" : "Score & End Match"}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <InlineScorePanel match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
              onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch} />
          )}
        </>
      )}
    </div>
  );
}

function ScoreboardCard({
  match, isOrganiser, isSignedUp, currentPlayerProfileId, defaultPointsToPlayTo = 21,
  onCompleteMatch, onEndSet, onCancelMatch, onUpdatePointsTarget, onUpdateSets,
  onSwapPlayer, availablePlayers, busyPlayerIds, sessionMatchCounts, achievements,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  defaultPointsToPlayTo?: number;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  availablePlayers?: Player[];
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
  achievements?: PlayerAchievements;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const courtColor = getCourtColor(match.courtNumber || 1);
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const matchSets = match.numberOfSets || 1;

  const handlePointsSave = (val: number) => {
    if (!isNaN(val) && val >= 1 && val !== pointsTarget && onUpdatePointsTarget) onUpdatePointsTarget(match.id, val);
    setEditingPoints(false);
  };

  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const setsWonA = match.setsWonA || 0;
  const setsWonB = match.setsWonB || 0;
  const isMultiSet = (match.numberOfSets || 1) > 1;

  const scoreADigits = String(scoreA).padStart(2, "0").split("");
  const scoreBDigits = String(scoreB).padStart(2, "0").split("");

  const courtName = match.courtNumber ? `Court ${match.courtNumber}` : "Court";

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );
  const canInteract = isOrganiser || (isSignedUp && isPlayerInMatch);

  const digitStyle = "font-black tabular-nums leading-none";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] overflow-hidden" data-testid={`pro-scoreboard-${match.id}`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: courtColor.ring }} />
          <span className="text-xs font-bold text-gray-500 dark:text-white/60 uppercase tracking-wider">{courtName}</span>
        </div>
        {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
      </div>

      <div className="flex items-start justify-between px-4 pb-2 gap-2">
        <div className="flex flex-col min-w-0 max-w-[45%]">
          {match.teamAPlayer1 && (
            <ClickablePlayerName player={match.teamAPlayer1} matchId={match.id} position="teamAPlayer1Id"
              availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1.id]}
              className="text-xs sm:text-sm font-semibold truncate" isBusy={busyPlayerIds?.has(match.teamAPlayer1.id)}
              style={{ color: courtColor.ring }} achievements={achievements} />
          )}
          {match.teamAPlayer2 && (
            <ClickablePlayerName player={match.teamAPlayer2} matchId={match.id} position="teamAPlayer2Id"
              availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2.id]}
              className="text-xs sm:text-sm font-semibold truncate" isBusy={busyPlayerIds?.has(match.teamAPlayer2.id)}
              style={{ color: courtColor.ring }} achievements={achievements} />
          )}
        </div>
        <div className="flex flex-col items-end min-w-0 max-w-[45%]">
          {match.teamBPlayer1 && (
            <ClickablePlayerName player={match.teamBPlayer1} matchId={match.id} position="teamBPlayer1Id"
              availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1.id]}
              className="text-xs sm:text-sm font-semibold text-blue-400 truncate text-right" isBusy={busyPlayerIds?.has(match.teamBPlayer1.id)} achievements={achievements} />
          )}
          {match.teamBPlayer2 && (
            <ClickablePlayerName player={match.teamBPlayer2} matchId={match.id} position="teamBPlayer2Id"
              availablePlayers={availablePlayers || []} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2.id]}
              className="text-xs sm:text-sm font-semibold text-blue-400 truncate text-right" isBusy={busyPlayerIds?.has(match.teamBPlayer2.id)} achievements={achievements} />
          )}
        </div>
      </div>

      <div className="mx-3 mb-3 relative rounded-xl overflow-hidden border border-white/10" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-center justify-center py-4 px-3">
          <div className="flex items-center gap-1.5">
            {scoreADigits.map((d, i) => (
              <div key={`a-${i}`} className="relative w-12 h-16 sm:w-16 sm:h-[5.5rem] rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: courtColor.bg, border: `1px solid ${courtColor.ring}30` }}>
                <div className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
                <span className={cn(digitStyle, "text-4xl sm:text-6xl")} style={{ color: courtColor.ring, textShadow: `0 0 20px ${courtColor.glow}` }}>{d}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center px-2 sm:px-3 gap-1">
            {isMultiSet ? (
              <>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                  <span className="text-sm sm:text-base font-black text-red-400 tabular-nums leading-none">{setsWonA}</span>
                </div>
                <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">vs</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                  <span className="text-sm sm:text-base font-black text-red-400 tabular-nums leading-none">{setsWonB}</span>
                </div>
              </>
            ) : (
              <span className="text-xs font-bold text-gray-300 dark:text-white/20 uppercase tracking-widest">vs</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {scoreBDigits.map((d, i) => (
              <div key={`b-${i}`} className="relative w-12 h-16 sm:w-16 sm:h-[5.5rem] rounded-lg overflow-hidden flex items-center justify-center bg-blue-400/10 border border-blue-400/20">
                <div className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
                <span className={cn(digitStyle, "text-4xl sm:text-6xl text-blue-400")} style={{ textShadow: '0 0 20px rgba(96,165,250,0.5)' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {isMultiSet && match.setScores && match.setScores.length > 0 && (
          <div className="flex items-center justify-center gap-2 pb-3">
            {match.setScores.map((s: any, i: number) => (
              <span key={i} className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-2 py-0.5 rounded" data-testid={`scoreboard-set-${i}`}>{s.scoreA}-{s.scoreB}</span>
            ))}
          </div>
        )}
      </div>

      {isOrganiser && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Target className="w-3 h-3 text-gray-400 dark:text-white/25" />
              {editingPoints ? (
                <input
                  type="number"
                  min="1"
                  className="w-12 border border-gray-200 dark:border-white/15 rounded px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  defaultValue={pointsTarget}
                  autoFocus
                  onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10)); if (e.key === "Escape") setEditingPoints(false); }}
                  data-testid={`input-scoreboard-points-${match.id}`}
                />
              ) : (
                <span
                  className="text-xs text-gray-400 dark:text-white/35 font-mono cursor-pointer transition-colors"
                  onClick={() => setEditingPoints(true)}
                  data-testid={`scoreboard-points-${match.id}`}
                >
                  Play to {pointsTarget}
                </span>
              )}
            </div>
            {onUpdateSets && (
              <div onClick={(e) => e.stopPropagation()}>
                <Select value={String(matchSets)} onValueChange={(v) => onUpdateSets?.(match.id, Number(v))}>
                  <SelectTrigger
                    className="h-6 w-auto min-w-0 gap-0.5 px-2 text-[10px] bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/35 rounded-full"
                    data-testid={`select-scoreboard-sets-${match.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" data-testid={`scoreboard-sets-option-1-${match.id}`}>1 Set</SelectItem>
                    <SelectItem value="2" data-testid={`scoreboard-sets-option-2-${match.id}`}>2 Sets</SelectItem>
                    <SelectItem value="3" data-testid={`scoreboard-sets-option-3-${match.id}`}>Bo3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {canInteract && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-gray-100 dark:border-white/[0.05] text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-all duration-300 active:scale-[0.98]"
            data-testid={`pro-scoreboard-expand-${match.id}`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">{expanded ? "Hide Controls" : "Score & End Match"}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <InlineScorePanel match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
              onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch} />
          )}
        </>
      )}
    </div>
  );
}

type SubView = "overview" | "court" | "list" | "score" | "broadcast";

function MiniCourtTile({
  match, courtNames, onClick,
}: {
  match: CourtMatch;
  courtNames?: string[];
  onClick: () => void;
}) {
  const courtColor = getCourtColor(match.courtNumber || 1);
  const courtLabel = match.courtNumber ? courtNames?.[match.courtNumber - 1] || `C${match.courtNumber}` : "C";
  const isDoubles = !!match.teamAPlayer2 || !!match.teamBPlayer2;
  const firstName = (name?: string) => name?.split(" ")[0] || "?";

  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-[1/1.15] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] transition-all duration-300 active:scale-[0.97] group bg-white dark:bg-slate-900/95"
      data-testid={`overview-tile-${match.id}`}
    >
      <div className="absolute inset-[8%] border border-gray-200 dark:border-white/20 rounded-sm" />
      <div className="absolute left-1/2 top-[8%] bottom-[8%] w-px bg-gray-200 dark:bg-white/15" style={{ transform: 'translateX(-50%)' }} />
      <div className="absolute left-[8%] right-1/2 top-[32%] bottom-[32%] border border-gray-200 dark:border-white/10" />
      <div className="absolute right-[8%] left-1/2 top-[32%] bottom-[32%] border border-gray-200 dark:border-white/10" />

      <div className="absolute left-[12%] top-[14%] z-10 max-w-[38%]">
        <span className="text-[10px] sm:text-xs font-bold truncate block" style={{ color: courtColor.ring }}>
          {firstName(match.teamAPlayer1?.user?.fullName)}
        </span>
      </div>
      {isDoubles && match.teamAPlayer2 && (
        <div className="absolute left-[12%] bottom-[14%] z-10 max-w-[38%]">
          <span className="text-[10px] sm:text-xs font-bold truncate block" style={{ color: courtColor.ring }}>
            {firstName(match.teamAPlayer2?.user?.fullName)}
          </span>
        </div>
      )}
      <div className="absolute right-[12%] top-[14%] z-10 max-w-[38%] text-right">
        <span className="text-[10px] sm:text-xs font-bold text-blue-400 truncate block">
          {firstName(match.teamBPlayer1?.user?.fullName)}
        </span>
      </div>
      {isDoubles && match.teamBPlayer2 && (
        <div className="absolute right-[12%] bottom-[14%] z-10 max-w-[38%] text-right">
          <span className="text-[10px] sm:text-xs font-bold text-blue-400 truncate block">
            {firstName(match.teamBPlayer2?.user?.fullName)}
          </span>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-black/70 backdrop-blur-sm border border-gray-200 dark:border-white/10">
            <span className="text-[9px] sm:text-[10px] font-black uppercase" style={{ color: courtColor.ring }}>{courtLabel}</span>
            {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-sm sm:text-base font-black tabular-nums" style={{ color: courtColor.ring }}>{match.scoreA || 0}</span>
            <span className="text-[8px] text-gray-300 dark:text-white/30 font-bold">-</span>
            <span className="text-sm sm:text-base font-black text-blue-400 tabular-nums">{match.scoreB || 0}</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-white/0 group-hover:bg-gray-50/50 dark:group-hover:bg-white/[0.03] transition-colors duration-300" />
    </button>
  );
}

function CourtDetailDialog({
  match, open, onOpenChange, isOrganiser, isSignedUp, currentPlayerProfileId,
  defaultPointsToPlayTo = 21, courtNames, availablePlayers,
  onCompleteMatch, onEndSet, onCancelMatch, onUpdatePointsTarget, onUpdateSets,
  onSwapPlayer, busyPlayerIds, sessionMatchCounts, achievements,
}: {
  match: CourtMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  defaultPointsToPlayTo?: number;
  courtNames?: string[];
  availablePlayers: Player[];
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
  onUpdatePointsTarget?: (matchId: number, pointsToPlayTo: number) => void;
  onUpdateSets?: (matchId: number, numberOfSets: number) => void;
  onSwapPlayer?: (matchId: number, position: string, newPlayerId: number) => void;
  busyPlayerIds?: Set<number>;
  sessionMatchCounts?: Record<number, number>;
  achievements?: PlayerAchievements;
}) {
  const [editingPoints, setEditingPoints] = useState(false);

  if (!match) return null;

  const courtColor = getCourtColor(match.courtNumber || 1);
  const courtLabel = match.courtNumber ? courtNames?.[match.courtNumber - 1] || `Court ${match.courtNumber}` : "Court";
  const pointsTarget = match.pointsToPlayTo || defaultPointsToPlayTo;
  const matchSets = match.numberOfSets || 1;
  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const setsWonA = match.setsWonA || 0;
  const setsWonB = match.setsWonB || 0;
  const isMultiSet = matchSets > 1;

  const handlePointsSave = (val: number) => {
    if (!isNaN(val) && val >= 1 && val !== pointsTarget && onUpdatePointsTarget) onUpdatePointsTarget(match.id, val);
    setEditingPoints(false);
  };

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );
  const canInteract = isOrganiser || (isSignedUp && isPlayerInMatch);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-0 bg-slate-950 border-white/10 overflow-hidden" data-testid={`overview-detail-${match.id}`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{courtLabel}</DialogTitle>
          <DialogDescription>Match details and controls</DialogDescription>
        </DialogHeader>

        <div className="relative" style={{ background: `linear-gradient(135deg, ${courtColor.bg} 0%, rgba(15,23,42,0.98) 50%, ${courtColor.bg} 100%)` }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: courtColor.ring }} />
                <span className="text-sm font-bold text-white uppercase tracking-wider">{courtLabel}</span>
              </div>
              {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: courtColor.ring }}>Team A</p>
                {match.teamAPlayer1 && (
                  <ClickablePlayerName player={match.teamAPlayer1} matchId={match.id} position="teamAPlayer1Id"
                    availablePlayers={availablePlayers} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                    showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1.id]}
                    className="text-xs font-semibold truncate block" isBusy={busyPlayerIds?.has(match.teamAPlayer1.id)}
                    style={{ color: courtColor.ring }} achievements={achievements} />
                )}
                {match.teamAPlayer2 && (
                  <ClickablePlayerName player={match.teamAPlayer2} matchId={match.id} position="teamAPlayer2Id"
                    availablePlayers={availablePlayers} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                    showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2.id]}
                    className="text-xs font-semibold truncate block" isBusy={busyPlayerIds?.has(match.teamAPlayer2.id)}
                    style={{ color: courtColor.ring }} achievements={achievements} />
                )}
              </div>
              <div className="flex flex-col items-center px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black tabular-nums" style={{ color: courtColor.ring }}>{scoreA}</span>
                  <span className="text-sm font-bold text-white/20">-</span>
                  <span className="text-3xl font-black text-blue-400 tabular-nums">{scoreB}</span>
                </div>
                {isMultiSet && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-bold" style={{ color: courtColor.ring }}>{setsWonA}</span>
                    <span className="text-[9px] text-white/20">sets</span>
                    <span className="text-[10px] font-bold text-blue-400">{setsWonB}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1">Team B</p>
                {match.teamBPlayer1 && (
                  <ClickablePlayerName player={match.teamBPlayer1} matchId={match.id} position="teamBPlayer1Id"
                    availablePlayers={availablePlayers} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                    showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1.id]}
                    className="text-xs font-semibold text-blue-400 truncate block text-right" isBusy={busyPlayerIds?.has(match.teamBPlayer1.id)} achievements={achievements} />
                )}
                {match.teamBPlayer2 && (
                  <ClickablePlayerName player={match.teamBPlayer2} matchId={match.id} position="teamBPlayer2Id"
                    availablePlayers={availablePlayers} canSwap={isOrganiser} onSwapPlayer={onSwapPlayer}
                    showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2.id]}
                    className="text-xs font-semibold text-blue-400 truncate block text-right" isBusy={busyPlayerIds?.has(match.teamBPlayer2.id)} achievements={achievements} />
                )}
              </div>
            </div>

            {isMultiSet && match.setScores && match.setScores.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                {match.setScores.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04]">
                    <span className="text-[9px] text-white/30 font-semibold">G{i + 1}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: s.scoreA > s.scoreB ? courtColor.ring : 'rgba(255,255,255,0.4)' }}>{s.scoreA}</span>
                    <span className="text-[9px] text-white/20">-</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: s.scoreB > s.scoreA ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.4)' }}>{s.scoreB}</span>
                  </div>
                ))}
              </div>
            )}

            {isOrganiser && (
              <div className="flex items-center justify-center gap-4 py-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Target className="w-3 h-3 text-white/25" />
                  {editingPoints ? (
                    <input
                      type="number"
                      min="1"
                      className="w-14 border border-white/15 rounded px-1.5 py-1 text-xs bg-white/[0.06] text-white text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      defaultValue={pointsTarget}
                      autoFocus
                      onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                      onKeyDown={(e) => { if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10)); if (e.key === "Escape") setEditingPoints(false); }}
                      data-testid={`input-overview-points-${match.id}`}
                    />
                  ) : (
                    <span
                      className="text-xs text-white/40 font-mono cursor-pointer transition-colors"
                      onClick={() => setEditingPoints(true)}
                      data-testid={`overview-points-${match.id}`}
                    >
                      Play to {pointsTarget}
                    </span>
                  )}
                </div>
                {onUpdateSets && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select value={String(matchSets)} onValueChange={(v) => onUpdateSets?.(match.id, Number(v))}>
                      <SelectTrigger
                        className="h-7 w-auto min-w-0 gap-0.5 px-2.5 text-[11px] bg-white/[0.04] border-white/10 text-white/40 rounded-full"
                        data-testid={`select-overview-sets-${match.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" data-testid={`overview-sets-option-1-${match.id}`}>1 Set</SelectItem>
                        <SelectItem value="2" data-testid={`overview-sets-option-2-${match.id}`}>2 Sets</SelectItem>
                        <SelectItem value="3" data-testid={`overview-sets-option-3-${match.id}`}>Bo3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {canInteract && (
          <div className="p-0">
            <InlineScorePanel match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
              onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ProLiveMatchesProps = {
  liveMatches: CourtMatch[];
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  availablePlayers: Player[];
  courtNames?: string[];
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
  courtNames, defaultPointsToPlayTo = 21, sessionMatchCounts, achievements,
  onCompleteMatch, onEndSet, onCancelMatch, onSwapPlayer,
  onCourtNameChange, onUpdatePointsTarget, onUpdateSets, busyPlayerIds,
}: ProLiveMatchesProps) {
  const [subView, setSubView] = useState<SubView>("overview");
  const [sectionLight, setSectionLight] = useState(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabScroll = useCallback(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    checkTabScroll();
    el.addEventListener("scroll", checkTabScroll, { passive: true });
    const ro = new ResizeObserver(checkTabScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkTabScroll); ro.disconnect(); };
  }, [checkTabScroll]);

  const scrollTabs = useCallback((dir: "left" | "right") => {
    const el = tabScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" });
  }, []);

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const selectedMatch = liveMatches.find(m => m.id === selectedMatchId) || null;

  const subViews: { key: SubView; label: string; icon: typeof List }[] = [
    { key: "overview", label: "Overview", icon: Maximize2 },
    { key: "court", label: "Courts", icon: LayoutGrid },
    { key: "list", label: "List", icon: List },
    { key: "score", label: "Score", icon: Hash },
    { key: "broadcast", label: "Broadcast", icon: Monitor },
  ];

  if (liveMatches.length === 0) {
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

          <div className="flex items-center gap-1 min-w-0 max-w-full" data-testid="pro-live-view-toggle">
            {canScrollLeft && (
              <button
                onClick={() => scrollTabs("left")}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
                aria-label="Scroll tabs left"
                data-testid="pro-live-tab-scroll-left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div
              ref={tabScrollRef}
              className="flex items-center rounded-full border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] p-1 overflow-x-auto no-scrollbar touch-pan-x"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              {subViews.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSubView(key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 whitespace-nowrap shrink-0",
                    subView === key
                      ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60"
                  )}
                  data-testid={`pro-live-tab-${key}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {canScrollRight && (
              <button
                onClick={() => scrollTabs("right")}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
                aria-label="Scroll tabs right"
                data-testid="pro-live-tab-scroll-right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {subView === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {liveMatches.map(match => (
                <MiniCourtTile key={match.id} match={match} courtNames={courtNames}
                  onClick={() => setSelectedMatchId(match.id)} />
              ))}
            </div>
            <CourtDetailDialog
              match={selectedMatch}
              open={selectedMatchId !== null}
              onOpenChange={(open) => { if (!open) setSelectedMatchId(null); }}
              isOrganiser={isOrganiser}
              isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId}
              defaultPointsToPlayTo={defaultPointsToPlayTo}
              courtNames={courtNames}
              availablePlayers={availablePlayers}
              onCompleteMatch={onCompleteMatch}
              onEndSet={onEndSet}
              onCancelMatch={onCancelMatch}
              onUpdatePointsTarget={onUpdatePointsTarget}
              onUpdateSets={onUpdateSets}
              onSwapPlayer={onSwapPlayer}
              busyPlayerIds={busyPlayerIds}
              sessionMatchCounts={sessionMatchCounts}
              achievements={achievements}
            />
          </>
        )}

        {subView === "list" && (
          <div className="space-y-4">
            {liveMatches.map(match => (
              <LiveMatchRow
                key={match.id}
                match={match}
                isOrganiser={isOrganiser}
                isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId}
                availablePlayers={availablePlayers}
                courtName={match.courtNumber ? courtNames?.[match.courtNumber - 1] : undefined}
                defaultPointsToPlayTo={defaultPointsToPlayTo}
                sessionMatchCounts={sessionMatchCounts}
                achievements={achievements}
                onCompleteMatch={onCompleteMatch}
                onEndSet={onEndSet}
                onCancelMatch={onCancelMatch}
                onSwapPlayer={onSwapPlayer}
                onCourtNameChange={onCourtNameChange}
                onUpdatePointsTarget={onUpdatePointsTarget}
                onUpdateSets={onUpdateSets}
                busyPlayerIds={busyPlayerIds}
              />
            ))}
          </div>
        )}

        {subView === "court" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 landscape-court-grid">
            {liveMatches.map(match => (
              <CourtCard key={match.id} match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId} courtNames={courtNames}
                defaultPointsToPlayTo={defaultPointsToPlayTo}
                onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch}
                onUpdatePointsTarget={onUpdatePointsTarget} onUpdateSets={onUpdateSets}
                onSwapPlayer={onSwapPlayer} availablePlayers={availablePlayers} busyPlayerIds={busyPlayerIds}
                sessionMatchCounts={sessionMatchCounts} achievements={achievements} />
            ))}
          </div>
        )}

        {subView === "score" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveMatches.map(match => (
              <ScoreboardCard key={match.id} match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
                onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch}
                onUpdatePointsTarget={onUpdatePointsTarget} onUpdateSets={onUpdateSets}
                onSwapPlayer={onSwapPlayer} availablePlayers={availablePlayers} busyPlayerIds={busyPlayerIds}
                sessionMatchCounts={sessionMatchCounts} achievements={achievements} />
            ))}
          </div>
        )}

        {subView === "broadcast" && (
          <div className="grid grid-cols-1 gap-5">
            {liveMatches.map(match => (
              <BroadcastCard key={match.id} match={match} isOrganiser={isOrganiser} isSignedUp={isSignedUp}
                currentPlayerProfileId={currentPlayerProfileId} defaultPointsToPlayTo={defaultPointsToPlayTo}
                onCompleteMatch={onCompleteMatch} onEndSet={onEndSet} onCancelMatch={onCancelMatch}
                onUpdatePointsTarget={onUpdatePointsTarget} onUpdateSets={onUpdateSets}
                onSwapPlayer={onSwapPlayer} availablePlayers={availablePlayers} busyPlayerIds={busyPlayerIds}
                sessionMatchCounts={sessionMatchCounts} achievements={achievements} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
