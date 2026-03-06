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
  List, LayoutGrid, BarChart3, Clock, Trophy, CheckCircle, XCircle,
  Swords, ChevronDown, Pencil, Users, Target, Check, Minus, Plus,
  Activity, Zap, CircleDot
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
    <span className="font-mono text-xs text-white/50 tabular-nums" data-testid="pro-live-timer">
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

function ClickablePlayerName({
  player, matchId, position, availablePlayers, canSwap, onSwapPlayer, sessionMatchCount, showMatchCount, className, isBusy,
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
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = player?.user?.fullName || "Unknown";
  const nameWithCount = showMatchCount && sessionMatchCount != null ? (
    <>{name} <span className="text-white/30 font-normal text-[10px]">({sessionMatchCount})</span></>
  ) : name;
  const busyClass = isBusy ? "text-red-400 animate-pulse" : "";
  if (!canSwap || !onSwapPlayer) return <span className={cn(className, busyClass)}>{nameWithCount}</span>;
  return (
    <>
      <span role="button" tabIndex={0} className={cn(className, busyClass, "cursor-pointer hover:underline hover:text-amber-400 transition-colors")}
        onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); } }}
        data-testid={`pro-swap-${position}-${matchId}`}
      >{nameWithCount}</span>
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
  courtName, defaultPointsToPlayTo = 21, sessionMatchCounts,
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
      className="pro-live-row group relative overflow-hidden rounded-2xl border border-white/[0.07] transition-all duration-300 hover:border-white/[0.12]"
      style={{ background: `linear-gradient(135deg, ${courtColor.bg} 0%, rgba(15,23,42,0.95) 50%)` }}
      data-testid={`pro-live-match-${match.id}`}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")' }} />

      <div
        role="button"
        tabIndex={canInteract ? 0 : -1}
        aria-expanded={expanded}
        className={cn("relative z-10 flex items-center gap-4 px-5 py-4 select-none", canInteract ? "cursor-pointer" : "cursor-default")}
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
                className="w-24 text-xs px-2 py-0.5 font-semibold bg-slate-800 border border-white/20 rounded-lg text-white outline-none"
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
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-400/20 bg-emerald-400/5" data-testid={`pro-live-badge-${match.id}`}>LIVE</span>
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClickablePlayerName player={match.teamAPlayer1} matchId={match.id} position="teamAPlayer1Id"
              availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer1?.id]}
              className="text-sm font-bold text-white truncate" isBusy={!!match.teamAPlayer1?.id && busyPlayerIds?.has(match.teamAPlayer1.id)} />
            {match.teamAPlayer2 && (
              <>
                <span className="text-white/20 text-xs">&</span>
                <ClickablePlayerName player={match.teamAPlayer2} matchId={match.id} position="teamAPlayer2Id"
                  availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
                  showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamAPlayer2?.id]}
                  className="text-sm font-bold text-white truncate" isBusy={!!match.teamAPlayer2?.id && busyPlayerIds?.has(match.teamAPlayer2.id)} />
              </>
            )}
          </div>
          <span className="text-white/20 text-xs font-bold uppercase tracking-widest shrink-0">vs</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <ClickablePlayerName player={match.teamBPlayer1} matchId={match.id} position="teamBPlayer1Id"
              availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
              showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer1?.id]}
              className="text-sm font-bold text-white/80 truncate" isBusy={!!match.teamBPlayer1?.id && busyPlayerIds?.has(match.teamBPlayer1.id)} />
            {match.teamBPlayer2 && (
              <>
                <span className="text-white/20 text-xs">&</span>
                <ClickablePlayerName player={match.teamBPlayer2} matchId={match.id} position="teamBPlayer2Id"
                  availablePlayers={availablePlayers} canSwap={canSwapPlayers} onSwapPlayer={onSwapPlayer}
                  showMatchCount sessionMatchCount={sessionMatchCounts?.[match.teamBPlayer2?.id]}
                  className="text-sm font-bold text-white/80 truncate" isBusy={!!match.teamBPlayer2?.id && busyPlayerIds?.has(match.teamBPlayer2.id)} />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isMultiSet && match.setScores && match.setScores.length > 0 && (
            <div className="flex gap-1">
              {match.setScores.map((s, i) => (
                <span key={i} className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{s.scoreA}-{s.scoreB}</span>
              ))}
            </div>
          )}

          {(isOrganiser) && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              {editingPoints ? (
                <input type="number" min="1" className="w-12 border border-white/10 rounded px-1 py-0 text-[10px] bg-slate-800 text-white text-center outline-none"
                  defaultValue={pointsTarget} autoFocus
                  onBlur={(e) => handlePointsSave(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePointsSave(parseInt((e.target as HTMLInputElement).value, 10)); if (e.key === "Escape") setEditingPoints(false); }}
                  data-testid={`input-pro-points-${match.id}`} />
              ) : (
                <span className="text-[10px] text-white/30 font-mono cursor-pointer hover:text-white/50 transition-colors"
                  onClick={() => setEditingPoints(true)} data-testid={`pro-points-${match.id}`}>
                  <Target className="w-2.5 h-2.5 inline mr-0.5" />{pointsTarget}
                </span>
              )}
              {onUpdateSets && (
                <Select value={String(matchSets)} onValueChange={(v) => onUpdateSets?.(match.id, Number(v))}>
                  <SelectTrigger className="h-5 w-auto min-w-0 gap-0.5 px-1.5 text-[9px] bg-transparent border-white/10 text-white/30" data-testid={`select-pro-sets-${match.id}`}>
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
            <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform duration-300", expanded && "rotate-180")} />
          )}
        </div>
      </div>

      <div ref={contentRef} className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: expanded ? contentRef.current?.scrollHeight ? `${contentRef.current.scrollHeight + 20}px` : "400px" : "0px",
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div className="relative z-10 px-5 pb-5 pt-1 border-t border-white/[0.05]">
          {step === "success" ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
              <span className="text-sm font-semibold text-white">Score Saved</span>
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-4 pt-3">
              <p className="text-xs text-white/40 text-center">Confirm {isMultiSet ? `Set ${currentSet}` : "final"} result</p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Team A</p>
                  <div className={cn("text-3xl font-bold font-mono tabular-nums", parseInt(scoreA) > parseInt(scoreB) ? "text-emerald-400" : "text-white/60")} style={{ fontFamily: "'Orbitron', monospace" }}>{scoreA}</div>
                  <p className="text-[10px] text-white/30 mt-1 truncate max-w-[120px]">{teamANames.join(" & ")}</p>
                </div>
                <Swords className="w-5 h-5 text-white/20" />
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Team B</p>
                  <div className={cn("text-3xl font-bold font-mono tabular-nums", parseInt(scoreB) > parseInt(scoreA) ? "text-blue-400" : "text-white/60")} style={{ fontFamily: "'Orbitron', monospace" }}>{scoreB}</div>
                  <p className="text-[10px] text-white/30 mt-1 truncate max-w-[120px]">{teamBNames.join(" & ")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 text-sm font-medium rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-300"
                  onClick={(e) => { e.stopPropagation(); setStep("input"); }} data-testid={`pro-match-back-${match.id}`}>Back</button>
                <button className="flex-1 px-4 py-2 text-sm font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 active:scale-95 transition-all duration-300"
                  onClick={(e) => { e.stopPropagation(); handleSubmitScore(); }} disabled={submitting} data-testid={`pro-match-confirm-${match.id}`}>
                  {submitting ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 block font-bold">Team A</label>
                  <p className="text-[10px] text-white/30 mb-1.5 truncate">{teamANames.join(" & ") || "Team A"}</p>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreA(String(Math.max(0, (parseInt(scoreA) || 0) - 1))); }} data-testid={`pro-score-a-minus-${match.id}`}>
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <Input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-800/80 border-emerald-500/20 text-white text-center text-xl font-mono h-10 focus:border-emerald-400/40 focus:ring-emerald-400/20"
                      style={{ fontFamily: "'Orbitron', monospace" }}
                      placeholder="0" data-testid={`pro-score-a-${match.id}`} />
                    <button className="w-8 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreA(String((parseInt(scoreA) || 0) + 1)); }} data-testid={`pro-score-a-plus-${match.id}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-white/15 font-bold text-sm mt-8">vs</div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] uppercase tracking-widest text-blue-400 mb-1 block font-bold">Team B</label>
                  <p className="text-[10px] text-white/30 mb-1.5 truncate">{teamBNames.join(" & ") || "Team B"}</p>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreB(String(Math.max(0, (parseInt(scoreB) || 0) - 1))); }} data-testid={`pro-score-b-minus-${match.id}`}>
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <Input type="number" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-800/80 border-blue-500/20 text-white text-center text-xl font-mono h-10 focus:border-blue-400/40 focus:ring-blue-400/20"
                      style={{ fontFamily: "'Orbitron', monospace" }}
                      placeholder="0" data-testid={`pro-score-b-${match.id}`} />
                    <button className="w-8 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setScoreB(String((parseInt(scoreB) || 0) + 1)); }} data-testid={`pro-score-b-plus-${match.id}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              {scoreA && scoreB && scoreA === scoreB && (
                <p className="text-[11px] text-red-400 text-center">Scores cannot be tied</p>
              )}
              <div className="flex gap-2">
                {isOrganiser && onCancelMatch && (
                  <button className="px-4 py-2 text-sm font-medium rounded-full border border-red-500/20 text-red-400/80 bg-red-500/5 hover:bg-red-500/10 active:scale-95 transition-all duration-300"
                    onClick={(e) => { e.stopPropagation(); onCancelMatch(match.id); }} data-testid={`pro-match-cancel-${match.id}`}>
                    <XCircle className="w-3.5 h-3.5 mr-1 inline" />Cancel
                  </button>
                )}
                <button className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 animate-pulse active:scale-95 transition-all duration-300"
                  style={{ animationDuration: '3s' }}
                  onClick={(e) => { e.stopPropagation(); handleSubmitScore(); }}
                  disabled={!scoreA || !scoreB || scoreA === scoreB || submitting}
                  data-testid={`pro-match-end-${match.id}`}>
                  <Trophy className="w-3.5 h-3.5 mr-1.5 inline" />
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

function CourtView({ match }: { match: CourtMatch }) {
  const courtColor = getCourtColor(match.courtNumber || 1);
  const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);

  return (
    <div className="relative w-full aspect-[2/1.2] rounded-xl overflow-hidden border border-white/[0.07]" data-testid={`pro-court-view-${match.id}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/40 via-emerald-800/30 to-emerald-900/40" />
      <div className="absolute inset-[6%] border-2 border-white/40 rounded-sm" />
      <div className="absolute left-1/2 top-[6%] bottom-[6%] w-0.5 bg-white/30" style={{ transform: 'translateX(-50%)' }} />
      <div className="absolute top-[6%] left-[6%] right-[6%] h-0 border-t-2 border-white/40" />
      <div className="absolute bottom-[6%] left-[6%] right-[6%] h-0 border-b-2 border-white/40" />
      <div className="absolute left-[6%] right-1/2 top-[30%] bottom-[30%] border border-white/20" />
      <div className="absolute right-[6%] left-1/2 top-[30%] bottom-[30%] border border-white/20" />

      <div className="absolute left-[15%] top-[25%] flex flex-col items-center gap-1 z-10">
        <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-[11px] font-semibold text-white truncate max-w-[100px]" data-testid={`pro-court-player-a1-${match.id}`}>
          {match.teamAPlayer1?.user?.fullName || "Player 1"}
        </div>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: courtColor.ring, boxShadow: `0 0 12px ${courtColor.glow}` }} />
      </div>
      {match.teamAPlayer2 && (
        <div className="absolute left-[15%] bottom-[25%] flex flex-col items-center gap-1 z-10">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-[11px] font-semibold text-white truncate max-w-[100px]" data-testid={`pro-court-player-a2-${match.id}`}>
            {match.teamAPlayer2.user?.fullName || "Player 2"}
          </div>
        </div>
      )}

      <div className="absolute right-[15%] top-[25%] flex flex-col items-center gap-1 z-10">
        <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-[11px] font-semibold text-white/80 truncate max-w-[100px]" data-testid={`pro-court-player-b1-${match.id}`}>
          {match.teamBPlayer1?.user?.fullName || "Player 3"}
        </div>
      </div>
      {match.teamBPlayer2 && (
        <div className="absolute right-[15%] bottom-[25%] flex flex-col items-center gap-1 z-10">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-[11px] font-semibold text-white/80 truncate max-w-[100px]" data-testid={`pro-court-player-b2-${match.id}`}>
            {match.teamBPlayer2.user?.fullName || "Player 4"}
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-sm border border-white/10">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider" style={{ color: courtColor.ring }}>
            {match.courtNumber ? `C${match.courtNumber}` : ""}
          </span>
          {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
        </div>
      </div>
    </div>
  );
}

function StatsView({ match }: { match: CourtMatch }) {
  const pointsTarget = match.pointsToPlayTo || 21;
  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const percentA = Math.min(100, (scoreA / pointsTarget) * 100);
  const percentB = Math.min(100, (scoreB / pointsTarget) * 100);
  const courtColor = getCourtColor(match.courtNumber || 1);
  const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);

  const circumference = 2 * Math.PI * 40;
  const dashA = (percentA / 100) * circumference;
  const dashB = (percentB / 100) * circumference;

  const leading = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;

  return (
    <div className="flex items-center justify-around py-4" data-testid={`pro-stats-view-${match.id}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={courtColor.ring} strokeWidth="6"
              strokeDasharray={`${dashA} ${circumference - dashA}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 500ms ease', filter: `drop-shadow(0 0 6px ${courtColor.glow})` }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold font-mono text-white tabular-nums" style={{ fontFamily: "'Orbitron', monospace" }}>{scoreA}</span>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider truncate max-w-[100px]">{teamANames.join(" & ") || "Team A"}</span>
        {leading === "A" && scoreA - scoreB >= 3 && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">
            <Zap className="w-2.5 h-2.5 inline mr-0.5" />{scoreA - scoreB} pt lead!
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">vs</span>
        <span className="text-[9px] text-white/15 font-mono">to {pointsTarget}</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(96,165,250)" strokeWidth="6"
              strokeDasharray={`${dashB} ${circumference - dashB}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 500ms ease', filter: `drop-shadow(0 0 6px rgba(96,165,250,0.6))` }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold font-mono text-white tabular-nums" style={{ fontFamily: "'Orbitron', monospace" }}>{scoreB}</span>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider truncate max-w-[100px]">{teamBNames.join(" & ") || "Team B"}</span>
        {leading === "B" && scoreB - scoreA >= 3 && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-400/20">
            <Zap className="w-2.5 h-2.5 inline mr-0.5" />{scoreB - scoreA} pt lead!
          </span>
        )}
      </div>
    </div>
  );
}

function TimelineView({ match }: { match: CourtMatch }) {
  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const total = scoreA + scoreB;
  const courtColor = getCourtColor(match.courtNumber || 1);

  const points: ("A" | "B")[] = [];
  for (let i = 0; i < Math.min(total, 10); i++) {
    const ratio = scoreA / (scoreA + scoreB || 1);
    points.push(Math.random() < ratio ? "A" : "B");
  }

  return (
    <div className="py-4 px-2" data-testid={`pro-timeline-view-${match.id}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Score Timeline</span>
        <span className="text-[10px] font-mono text-white/20">
          {scoreA} - {scoreB}
        </span>
      </div>
      <div className="relative flex flex-col items-center gap-0">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" style={{ transform: 'translateX(-50%)' }} />
        {points.length === 0 ? (
          <div className="py-6 text-center text-[10px] text-white/20">No points scored yet</div>
        ) : (
          points.map((point, i) => (
            <div key={i} className={cn("relative flex items-center gap-3 py-1.5 w-full", point === "A" ? "justify-start pl-[calc(50%+12px)]" : "justify-end pr-[calc(50%+12px)]")}>
              {point === "A" ? (
                <>
                  <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: courtColor.ring, backgroundColor: `${courtColor.ring}40` }} />
                  <span className="text-[10px] font-medium" style={{ color: courtColor.ring }}>Team A scores</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-medium" style={{ color: 'rgb(96,165,250)' }}>Team B scores</span>
                  <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: 'rgb(96,165,250)', backgroundColor: 'rgba(96,165,250,0.3)' }} />
                </>
              )}
            </div>
          ))
        )}
      </div>
      {match.setScores && match.setScores.length > 0 && (
        <div className="mt-3 flex gap-2 justify-center">
          {match.setScores.map((s, i) => (
            <span key={i} className="text-[10px] font-mono text-white/20 bg-white/[0.03] px-2 py-0.5 rounded">
              Set {i + 1}: {s.scoreA}-{s.scoreB}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type SubView = "list" | "court" | "stats" | "timeline";

type ProLiveMatchesProps = {
  liveMatches: CourtMatch[];
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  availablePlayers: Player[];
  courtNames?: string[];
  defaultPointsToPlayTo?: number;
  sessionMatchCounts?: Record<number, number>;
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
  courtNames, defaultPointsToPlayTo = 21, sessionMatchCounts,
  onCompleteMatch, onEndSet, onCancelMatch, onSwapPlayer,
  onCourtNameChange, onUpdatePointsTarget, onUpdateSets, busyPlayerIds,
}: ProLiveMatchesProps) {
  const [subView, setSubView] = useState<SubView>("list");

  const subViews: { key: SubView; label: string; icon: typeof List }[] = [
    { key: "list", label: "List", icon: List },
    { key: "court", label: "Court", icon: LayoutGrid },
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "timeline", label: "Timeline", icon: Activity },
  ];

  if (liveMatches.length === 0) {
    return (
      <div className="relative rounded-[2rem] border border-white/[0.07] bg-slate-950/90 backdrop-blur-2xl p-8 overflow-hidden" data-testid="pro-live-matches-empty">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }} />
        <div className="relative z-10 flex flex-col items-center justify-center py-8 gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center animate-spin" style={{ animationDuration: '12s' }}>
              <CircleDot className="w-6 h-6 text-white/15" />
            </div>
          </div>
          <p className="text-sm text-white/30 font-medium">No live matches</p>
          <p className="text-xs text-white/15">Generate matches and assign them to courts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-[2rem] border border-white/[0.07] bg-slate-950/90 backdrop-blur-2xl p-6 overflow-hidden" data-testid="pro-live-matches">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight" data-testid="pro-live-title">
              Live Courts
            </h3>
            <span className="text-xs font-mono text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">{liveMatches.length}</span>
          </div>

          <div className="flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] p-0.5" data-testid="pro-live-view-toggle">
            {subViews.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSubView(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all duration-300 active:scale-95",
                  subView === key
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/30 hover:text-white/60"
                )}
                data-testid={`pro-live-tab-${key}`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {subView === "list" && (
          <div className="space-y-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map(match => (
              <div key={match.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCourtColor(match.courtNumber || 1).ring }} />
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    {match.courtNumber ? courtNames?.[match.courtNumber - 1] || `Court ${match.courtNumber}` : "Court"}
                  </span>
                </div>
                <CourtView match={match} />
              </div>
            ))}
          </div>
        )}

        {subView === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map(match => (
              <div key={match.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
                <div className="flex items-center gap-2 px-3 pt-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCourtColor(match.courtNumber || 1).ring }} />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    {match.courtNumber ? courtNames?.[match.courtNumber - 1] || `Court ${match.courtNumber}` : "Court"}
                  </span>
                  {match.startedAt && <LiveTimer startedAt={match.startedAt} />}
                </div>
                <StatsView match={match} />
              </div>
            ))}
          </div>
        )}

        {subView === "timeline" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map(match => (
              <div key={match.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
                <div className="flex items-center gap-2 px-3 pt-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCourtColor(match.courtNumber || 1).ring }} />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    {match.courtNumber ? courtNames?.[match.courtNumber - 1] || `Court ${match.courtNumber}` : "Court"}
                  </span>
                </div>
                <TimelineView match={match} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
