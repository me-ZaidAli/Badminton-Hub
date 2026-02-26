import { useState, useEffect, useRef, useCallback } from "react";
import { type CourtMatch } from "@/components/BadmintonCourt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, Trophy, CheckCircle, XCircle, Swords, Clock } from "lucide-react";

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
  onStartMatch: (matchId: number, courtNumber: number) => void;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
};

function RollingDigit({ value, color = "green" }: { value: string; color?: "green" | "white" }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isRolling, setIsRolling] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsRolling(true);
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setIsRolling(false);
      }, 150);
      prevValue.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={cn(
        "inline-block w-[1.1ch] text-center font-mono transition-all duration-150",
        isRolling && "compact-digit-roll",
        color === "green" ? "text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]" : "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
      )}
    >
      {displayValue}
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

function MatchCard({
  match,
  isOrganiser,
  isSignedUp,
  currentPlayerProfileId,
  onCompleteMatch,
  onEndSet,
  onCancelMatch,
}: {
  match: CourtMatch;
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId?: number | null;
  onCompleteMatch: (matchId: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onEndSet: (matchId: number, setNumber: number, scoreA: number, scoreB: number) => Promise<any> | void;
  onCancelMatch?: (matchId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
  const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);

  const teamAGrades = [match.teamAPlayer1?.category, match.teamAPlayer2?.category].filter(Boolean);
  const teamBGrades = [match.teamBPlayer1?.category, match.teamBPlayer2?.category].filter(Boolean);

  const isMultiSet = (match.numberOfSets || 1) > 1;
  const currentSet = match.currentSet || 1;
  const isCompleted = match.status === "COMPLETED";
  const isLive = match.status === "LIVE";

  const isPlayerInMatch = currentPlayerProfileId && (
    match.teamAPlayer1?.id === currentPlayerProfileId ||
    match.teamAPlayer2?.id === currentPlayerProfileId ||
    match.teamBPlayer1?.id === currentPlayerProfileId ||
    match.teamBPlayer2?.id === currentPlayerProfileId
  );

  const canInteract = isLive && (isOrganiser || (isSignedUp && isPlayerInMatch));

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
    if (!canInteract && !isCompleted) return;
    setExpanded(!expanded);
    if (expanded) resetForm();
  };

  return (
    <div
      className={cn(
        "compact-match-card group relative overflow-hidden rounded-2xl border transition-all duration-300",
        isLive && "compact-match-card-live border-zinc-700/80",
        isCompleted && "compact-match-card-completed border-zinc-800/60",
        !isLive && !isCompleted && "border-zinc-800/40 bg-zinc-900/60"
      )}
      data-testid={`compact-match-card-${match.id}`}
    >
      <div
        role="button"
        tabIndex={canInteract || isCompleted ? 0 : -1}
        aria-expanded={expanded}
        aria-label={`Match: ${teamANames.join(" & ")} vs ${teamBNames.join(" & ")}${isLive ? " - Live" : isCompleted ? " - Completed" : ""}`}
        className={cn(
          "flex items-center gap-3 px-4 py-3 select-none",
          canInteract || isCompleted ? "cursor-pointer" : "cursor-default"
        )}
        onClick={toggleExpand}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(); } }}
        data-testid={`compact-match-toggle-${match.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {match.courtNumber && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 font-semibold tracking-wider border-zinc-600 shrink-0",
                  isLive ? "text-[#39ff14] border-[#39ff14]/30 bg-[#39ff14]/5" : "text-zinc-400"
                )}
              >
                C{match.courtNumber}
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
            {isMultiSet && isLive && (
              <span className="text-[10px] text-zinc-500">Set {currentSet}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">{teamANames.join(" & ")}</span>
                {teamAGrades.length > 0 && (
                  <span className="text-[10px] text-amber-400/70 font-mono shrink-0">{teamAGrades.join("/")}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-semibold text-zinc-300 truncate">{teamBNames.join(" & ")}</span>
                {teamBGrades.length > 0 && (
                  <span className="text-[10px] text-amber-400/70 font-mono shrink-0">{teamBGrades.join("/")}</span>
                )}
              </div>
            </div>

            {isCompleted && match.scoreA != null && match.scoreB != null && (
              <div className="flex flex-col items-end shrink-0 mr-1">
                <span className={cn("text-lg font-bold font-mono tabular-nums", (match.scoreA ?? 0) > (match.scoreB ?? 0) ? "text-white" : "text-zinc-500")}>
                  {match.scoreA}
                </span>
                <span className={cn("text-lg font-bold font-mono tabular-nums", (match.scoreB ?? 0) > (match.scoreA ?? 0) ? "text-white" : "text-zinc-500")}>
                  {match.scoreB}
                </span>
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

        {(canInteract || isCompleted) && (
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
        <div className="px-4 pb-4 pt-1 border-t border-zinc-700/50">
          {isCompleted ? (
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
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <CheckCircle className="w-8 h-8 text-[#39ff14] drop-shadow-[0_0_12px_rgba(57,255,20,0.5)]" />
              <span className="text-sm font-semibold text-white">Score Saved</span>
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-3 pt-2">
              <div className="text-center">
                <p className="text-xs text-zinc-400 mb-2">Confirm {isMultiSet ? `Set ${currentSet}` : "final"} result</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className={cn("text-2xl font-bold font-mono", parseInt(scoreA) > parseInt(scoreB) ? "text-[#39ff14]" : "text-white")}>
                      {scoreA}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[100px]">{teamANames[0]}</p>
                  </div>
                  <Swords className="w-5 h-5 text-amber-400/60" />
                  <div className="text-center">
                    <div className={cn("text-2xl font-bold font-mono", parseInt(scoreB) > parseInt(scoreA) ? "text-[#39ff14]" : "text-white")}>
                      {scoreB}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[100px]">{teamBNames[0]}</p>
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
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block truncate">
                    {teamANames[0]}{teamANames[1] ? ` & ${teamANames[1]}` : ""}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800/80 border-zinc-700 text-white text-center text-lg font-mono h-10 compact-score-input"
                    placeholder="0"
                    data-testid={`compact-score-a-${match.id}`}
                  />
                </div>
                <div className="text-zinc-600 font-bold text-sm mt-4">vs</div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block truncate">
                    {teamBNames[0]}{teamBNames[1] ? ` & ${teamBNames[1]}` : ""}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800/80 border-zinc-700 text-white text-center text-lg font-mono h-10 compact-score-input"
                    placeholder="0"
                    data-testid={`compact-score-b-${match.id}`}
                  />
                </div>
              </div>

              {scoreA && scoreB && scoreA === scoreB && (
                <p className="text-[11px] text-red-400 text-center">Scores cannot be tied</p>
              )}

              <div className="flex gap-2">
                {isOrganiser && onCancelMatch && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                    onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                    data-testid={`compact-match-cancel-${match.id}`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 compact-submit-btn"
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
  isOrganiser,
  isSignedUp,
  currentPlayerProfileId,
  onStartMatch,
  onCompleteMatch,
  onEndSet,
  onCancelMatch,
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
                onCompleteMatch={onCompleteMatch}
                onEndSet={onEndSet}
                onCancelMatch={onCancelMatch}
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
            {queuedMatches.map(match => {
              const teamANames = [match.teamAPlayer1?.user?.fullName, match.teamAPlayer2?.user?.fullName].filter(Boolean);
              const teamBNames = [match.teamBPlayer1?.user?.fullName, match.teamBPlayer2?.user?.fullName].filter(Boolean);
              const teamAGrades = [match.teamAPlayer1?.category, match.teamAPlayer2?.category].filter(Boolean);
              const teamBGrades = [match.teamBPlayer1?.category, match.teamBPlayer2?.category].filter(Boolean);

              return (
                <div
                  key={match.id}
                  className="compact-match-card rounded-2xl border border-zinc-800/40 bg-zinc-900/40 px-4 py-3"
                  data-testid={`compact-queued-card-${match.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold tracking-wider border-zinc-700 text-zinc-500 shrink-0">
                      #{match.queuePosition}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-zinc-400 truncate">{teamANames.join(" & ")}</span>
                        {teamAGrades.length > 0 && <span className="text-[10px] text-amber-400/50 font-mono">{teamAGrades.join("/")}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-zinc-500 truncate">{teamBNames.join(" & ")}</span>
                        {teamBGrades.length > 0 && <span className="text-[10px] text-amber-400/50 font-mono">{teamBGrades.join("/")}</span>}
                      </div>
                    </div>
                    {isOrganiser && availableCourts.length > 0 && (
                      <div className="flex gap-1 shrink-0">
                        {availableCourts.slice(0, 3).map(court => (
                          <Button
                            key={court}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px] border-zinc-700 text-zinc-400 hover:text-white hover:border-amber-500/50 hover:bg-amber-500/10"
                            onClick={() => onStartMatch(match.id, court)}
                            data-testid={`compact-assign-court-${match.id}-${court}`}
                          >
                            C{court}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                onCompleteMatch={onCompleteMatch}
                onEndSet={onEndSet}
                onCancelMatch={onCancelMatch}
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
