import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PoundSterling, Layers, CheckCircle, Zap, Timer, Swords, BarChart3, Wallet, Pencil, Copy, Baby, Trash2, MoreVertical, ArrowRight, FileText, Trophy, Target } from "lucide-react";
import { Link } from "wouter";

type SessionItem = {
  id: number;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxPlayers: number;
  signupCount?: number;
  courtsAvailable: number;
  matchMode: string;
  clubId: number;
  sessionFee?: number | null;
  status?: string;
  genderRestriction?: string;
  sessionType?: string;
  isPrivate?: boolean;
  recurringEventId?: number | null;
  [key: string]: any;
};

type AdminActions = {
  editableClubIds: Set<number>;
  isOrganiserOnly: boolean;
  onCrowdControl: (sessionId: number) => void;
  onFinances: (session: SessionItem) => void;
  onEdit: (session: SessionItem) => void;
  onDuplicate: (session: SessionItem) => void;
  onToggleJunior: (session: SessionItem) => void;
  onDelete: (session: SessionItem) => void;
  onDetails: (session: SessionItem) => void;
};

type SessionViewProps = {
  sessions: SessionItem[];
  clubs: any[];
  onSessionClick: (session: SessionItem) => void;
  adminActions?: AdminActions;
};

type TimelineViewProps = SessionViewProps & {
  mySignupsBySession?: Map<number, any>;
  onSignUp?: (session: SessionItem) => void;
};

function SessionMiniCard({ session, clubs, onSessionClick, adminActions }: { session: SessionItem; clubs: any[]; onSessionClick: (s: SessionItem) => void; adminActions?: AdminActions }) {
  const clubName = clubs?.find(c => c.id === session.clubId)?.name || "";
  const isPast = new Date(session.date) < new Date();
  const isLive = session.status === "ACTIVE";
  const venue = (session as any).venue;
  const venueName = venue?.name || "";

  return (
    <div
      className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
        isLive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
        isPast ? "border-border/30 opacity-70" :
        "border-border/50 hover:border-primary/30"
      }`}
      onClick={() => onSessionClick(session)}
      data-testid={`session-mini-${session.id}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
        <span className="font-semibold text-sm truncate">{session.title}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {session.startTime}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {session.signupCount || 0}/{session.maxPlayers}
        </span>
        {venueName && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{venueName}{venue?.city ? `, ${venue.city}` : ""}</span>
          </span>
        )}
        {!venueName && clubName && <span className="truncate">{clubName}</span>}
      </div>
      {adminActions?.editableClubIds.has(session.clubId) && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => adminActions.onDetails(session)} data-testid={`button-rsvp-mini-${session.id}`}>
                <Users className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>RSVP</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => adminActions.onEdit(session)} data-testid={`button-edit-mini-${session.id}`}>
                <Pencil className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => adminActions.onCrowdControl(session.id)} data-testid={`button-crowd-mini-${session.id}`}>
                <BarChart3 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Crowd</TooltipContent>
          </Tooltip>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" data-testid={`button-more-mini-${session.id}`}>
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!adminActions.isOrganiserOnly && (
                <DropdownMenuItem onClick={() => adminActions.onFinances(session)}>
                  <Wallet className="h-4 w-4 mr-2" />Finances
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => adminActions.onDuplicate(session)}>
                <Copy className="h-4 w-4 mr-2" />Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => adminActions.onToggleJunior(session)}>
                <Baby className={`h-4 w-4 mr-2 ${session.sessionType === "JUNIORS_ONLY" ? "text-emerald-500" : ""}`} />
                {session.sessionType === "JUNIORS_ONLY" ? "Move to Sessions" : "Move to Juniors"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => adminActions.onDelete(session)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  return `${String(Math.floor(totalMin / 60) % 24).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

function computeEnergyScore(session: SessionItem): number {
  const playerRatio = Math.min(1, (session.signupCount || 0) / Math.max(1, session.maxPlayers));
  const durationFactor = Math.min(1, session.durationMinutes / 180);
  const modeFactor = session.matchMode === "COMPETITIVE" ? 1 : session.matchMode === "TRAINING" ? 0.7 : 0.5;
  const typeFactor = session.sessionType === "JUNIORS_ONLY" ? 0.6 : session.genderRestriction === "FEMALE_ONLY" ? 0.75 : 1;
  const courtDensity = session.maxPlayers > 0 && session.courtsAvailable > 0
    ? Math.min(1, (session.signupCount || 0) / (session.courtsAvailable * 4))
    : 0.5;
  return Math.round((playerRatio * 30 + durationFactor * 15 + modeFactor * 25 + courtDensity * 15 + typeFactor * 15));
}

function getIntensityLevel(session: SessionItem): { label: string; color: string } {
  if (session.matchMode === "COMPETITIVE") {
    const playerRatio = (session.signupCount || 0) / Math.max(1, session.maxPlayers);
    if (playerRatio > 0.8) return { label: "ELITE", color: "bg-amber-400/15 text-amber-600 dark:text-amber-400 ring-amber-400/30" };
    return { label: "HIGH", color: "bg-orange-400/15 text-orange-600 dark:text-orange-400 ring-orange-400/30" };
  }
  if (session.matchMode === "TRAINING") return { label: "MEDIUM", color: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 ring-emerald-400/30" };
  return { label: "LOW", color: "bg-blue-400/15 text-blue-600 dark:text-blue-400 ring-blue-400/30" };
}

function ExpandedSessionDetails({ session }: { session: SessionItem }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const { data: signups, isLoading: signupsLoading, isError: signupsError } = useQuery<any[]>({
    queryKey: ["/api/sessions", session.id, "signups"],
    queryFn: async () => {
      const r = await fetch(`/api/sessions/${session.id}/signups`);
      if (!r.ok) throw new Error("Failed to load signups");
      return r.json();
    },
    staleTime: 30000,
  });

  const { data: leaderboard, isLoading: leaderboardLoading, isError: leaderboardError } = useQuery<any[]>({
    queryKey: ["/api/sessions", session.id, "leaderboard"],
    queryFn: async () => {
      const r = await fetch(`/api/sessions/${session.id}/leaderboard`);
      if (!r.ok) throw new Error("Failed to load leaderboard");
      return r.json();
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [signups, leaderboard]);

  const confirmedPlayers = signups?.filter((s: any) => s.signupStatus === "CONFIRMED" || !s.signupStatus) || [];
  const waitingPlayers = signups?.filter((s: any) => s.signupStatus === "WAITING") || [];
  const matchesPlayed = leaderboard?.length ? leaderboard.reduce((max: number, p: any) => Math.max(max, p.played || 0), 0) : 0;
  const avgDifficulty = leaderboard?.length
    ? (leaderboard.reduce((sum: number, p: any) => sum + (p.winRate || 0), 0) / leaderboard.length * 10).toFixed(1)
    : null;

  const isLoading = signupsLoading || leaderboardLoading;
  const hasError = signupsError || leaderboardError;

  return (
    <div
      className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: height > 0 ? `${height + 16}px` : "500px" }}
      role="region"
      aria-label={`Details for ${session.title || "session"}`}
      id={`session-details-${session.id}`}
    >
      <div ref={contentRef} className="pt-3">
        <div className="h-px bg-border/30 mb-3" />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-2 text-xs text-muted-foreground">Loading details...</span>
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
            <span>Unable to load session details</span>
          </div>
        ) : (
          <div className="space-y-3">
            {confirmedPlayers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className="h-3 w-3 text-muted-foreground/70" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Players ({confirmedPlayers.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {confirmedPlayers.slice(0, 12).map((p: any, i: number) => (
                    <div key={p.id || i} className="flex items-center gap-1.5 bg-muted/40 dark:bg-muted/30 rounded-md px-2 py-1" data-testid={`expanded-player-${p.id || i}`}>
                      <div className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                        <Users className="h-2.5 w-2.5 text-muted-foreground/50" />
                      </div>
                      <span className="text-[11px] text-foreground dark:text-white/80 truncate max-w-[100px]">{p.playerName || p.fullName || "Player"}</span>
                    </div>
                  ))}
                  {confirmedPlayers.length > 12 && (
                    <div className="flex items-center bg-muted/40 dark:bg-muted/30 rounded-md px-2 py-1">
                      <span className="text-[11px] text-muted-foreground">+{confirmedPlayers.length - 12} more</span>
                    </div>
                  )}
                </div>
                {waitingPlayers.length > 0 && (
                  <div className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                    {waitingPlayers.length} on waiting list
                  </div>
                )}
              </div>
            )}

            {(matchesPlayed > 0 || leaderboard?.length) && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Swords className="h-3 w-3 text-muted-foreground/70" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Match Stats</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-foreground dark:text-white">{matchesPlayed}</span>
                    <p className="text-[9px] text-muted-foreground">Matches</p>
                  </div>
                  <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-foreground dark:text-white">{leaderboard?.length || 0}</span>
                    <p className="text-[9px] text-muted-foreground">Players Ranked</p>
                  </div>
                  {avgDifficulty && (
                    <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-2 text-center">
                      <span className="text-lg font-bold text-foreground dark:text-white">{avgDifficulty}</span>
                      <p className="text-[9px] text-muted-foreground">Avg Difficulty</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {leaderboard && leaderboard.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Trophy className="h-3 w-3 text-muted-foreground/70" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top Players</span>
                </div>
                <div className="space-y-1">
                  {leaderboard.slice(0, 3).map((p: any, i: number) => (
                    <div key={p.profileId || i} className="flex items-center justify-between bg-muted/25 dark:bg-muted/15 rounded-md px-2.5 py-1.5" data-testid={`expanded-rank-${i}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold w-4 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-amber-700"}`}>
                          {i + 1}
                        </span>
                        <span className="text-[11px] text-foreground dark:text-white/80">{p.fullName || "Player"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{p.wins || 0}W</span>
                        <span>{p.losses || 0}L</span>
                        <span className="font-medium text-foreground dark:text-white/70">{p.played || 0}P</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(session as any).sessionDetails && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="h-3 w-3 text-muted-foreground/70" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Session Notes</span>
                </div>
                <p className="text-[11px] text-muted-foreground bg-muted/25 dark:bg-muted/15 rounded-md px-2.5 py-2">
                  {(session as any).sessionDetails}
                </p>
              </div>
            )}

            <div className="pt-1">
              <Link href={`/sessions/${session.id}`}>
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" data-testid={`button-view-session-${session.id}`}>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  View Full Session
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineSessionCard({
  session,
  clubs,
  mySignup,
  isExpanded,
  onToggleExpand,
  onNavigate,
}: {
  session: SessionItem;
  clubs: any[];
  mySignup?: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
}) {
  const clubName = clubs?.find(c => c.id === session.clubId)?.name || "";
  const isPast = new Date(session.date) < new Date(new Date().toDateString());
  const isLive = session.status === "ACTIVE";
  const isSignedUp = mySignup && (mySignup.signupStatus === "CONFIRMED" || mySignup.signupStatus === "WAITING");
  const isWaiting = mySignup?.signupStatus === "WAITING";
  const venue = (session as any).venue;
  const venueName = venue?.name || "";
  const spotsLeft = session.maxPlayers - (session.signupCount || 0);
  const isFull = spotsLeft <= 0;
  const fillPercent = Math.min(100, Math.round(((session.signupCount || 0) / session.maxPlayers) * 100));
  const endTime = computeEndTime(session.startTime, session.durationMinutes);
  const energy = computeEnergyScore(session);
  const intensity = getIntensityLevel(session);
  const isElite = intensity.label === "ELITE";

  const accentColor = session.matchMode === "TRAINING"
    ? "bg-violet-500" : session.matchMode === "COMPETITIVE"
    ? "bg-amber-500" : "bg-blue-500";

  const playerCount = session.signupCount || 0;

  const handleCardClick = useCallback(() => {
    onToggleExpand();
  }, [onToggleExpand]);

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate();
  }, [onNavigate]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-controls={`session-details-${session.id}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); } }}
      className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none group ${
        isPast ? "opacity-55" : ""
      } ${isElite && !isPast ? "ring-1 ring-amber-400/30" : ""} ${isExpanded ? "shadow-lg" : "hover:-translate-y-[3px]"}`}
      onClick={handleCardClick}
      data-testid={`timeline-session-${session.id}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

      <div className={`p-4 pl-5 border rounded-xl backdrop-blur-sm ${
        isSignedUp ? "border-emerald-400/40 bg-emerald-500/5 dark:bg-emerald-500/[0.07]" :
        isLive ? "border-green-500/40 bg-green-500/5 dark:bg-green-500/[0.07]" :
        isFull && !isPast ? "border-red-400/30 bg-card/80 dark:bg-card/60" :
        isExpanded ? "border-primary/30 bg-card/90 dark:bg-card/70" :
        "border-border/40 bg-card/80 dark:bg-card/60 hover:border-primary/30"
      }`}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h4 className="font-bold text-sm sm:text-base truncate">{session.title || "Session"}</h4>
            {isLive && (
              <span className="tl-live-badge inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white">
                <span className="tl-live-dot w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
            )}
            {isSignedUp && (
              <Badge className={`text-[10px] h-5 ${isWaiting ? "bg-amber-500" : "bg-emerald-500"} text-white`}>
                {isWaiting ? "Waitlist" : "Joined"}
              </Badge>
            )}
            {isFull && !isPast && (
              <Badge className="text-[10px] h-5 bg-red-500 text-white">FULL</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleNavigate}
              aria-label={`Open ${session.title || "session"}`}
              className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              data-testid={`button-navigate-session-${session.id}`}
            >
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </button>
            <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
              <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </div>
        </div>

        <div className="h-px bg-border/40 mb-2.5" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-2.5">
          {venueName && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
              <span className="truncate">{venueName}{venue?.city ? `, ${venue.city}` : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
            <span className="font-medium">{session.startTime} → {endTime}</span>
          </div>
          {session.courtsAvailable > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
              <span>{session.courtsAvailable} Court{session.courtsAvailable !== 1 ? "s" : ""}</span>
            </div>
          )}
          {session.sessionFee != null && (
            <div className="flex items-center gap-1.5">
              <PoundSterling className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
              <span>£{(session.sessionFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
            <span>{session.durationMinutes >= 60 ? `${Math.floor(session.durationMinutes / 60)}h${session.durationMinutes % 60 > 0 ? ` ${session.durationMinutes % 60}m` : ""}` : `${session.durationMinutes}m`}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
          <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden max-w-[160px]">
            <div
              className={`h-full rounded-full tl-bar-fill ${
                isFull ? "bg-red-500" : fillPercent > 75 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <span className={`text-[11px] font-semibold tabular-nums ${isFull ? "text-red-500" : "text-muted-foreground"}`}>
            {playerCount}/{session.maxPlayers}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2.5" data-testid={`energy-score-${session.id}`}>
          <Zap className={`h-3.5 w-3.5 flex-shrink-0 ${energy > 70 ? "text-orange-500" : energy > 40 ? "text-amber-500" : "text-blue-500"}`} />
          <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden max-w-[120px]">
            <div
              className={`h-full rounded-full tl-energy-bar ${
                energy > 70 ? "bg-orange-500" : energy > 40 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ "--energy-width": `${energy}%` } as React.CSSProperties}
            />
          </div>
          <span className={`text-[10px] font-semibold tabular-nums ${energy > 70 ? "text-orange-500" : energy > 40 ? "text-amber-500" : "text-blue-500"}`}>
            {energy}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${intensity.color}`}>
              {intensity.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              session.matchMode === "COMPETITIVE"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : session.matchMode === "TRAINING"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            }`}>
              {session.matchMode}
            </span>
            {session.genderRestriction === "FEMALE_ONLY" && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">Females</span>
            )}
            {session.sessionType === "JUNIORS_ONLY" && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Juniors</span>
            )}
          </div>

          {playerCount > 0 && !isExpanded && (
            <div className="flex items-center -space-x-1.5">
              {Array.from({ length: Math.min(playerCount, 4) }).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <Users className="h-2.5 w-2.5 text-muted-foreground/60" />
                </div>
              ))}
              {playerCount > 4 && (
                <div className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-[8px] font-bold text-muted-foreground">+{playerCount - 4}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {(playerCount > 0 || (session as any).matchCount > 0) && (
          <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/30 pt-2" data-testid={`stats-strip-${session.id}`}>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500/70" />
              <span className="font-medium">{playerCount} Player{playerCount !== 1 ? "s" : ""}</span>
            </div>
            {(session as any).matchCount > 0 && (
              <div className="flex items-center gap-1">
                <Swords className="h-3 w-3 text-emerald-500/70" />
                <span className="font-medium">{(session as any).matchCount} Match{(session as any).matchCount !== 1 ? "es" : ""}</span>
              </div>
            )}
            {(session as any).matchCount > 0 && playerCount > 1 && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-orange-500/70" />
                <span className="font-medium">Avg {Math.min(10, ((session as any).matchCount / playerCount * 5)).toFixed(1)} Difficulty</span>
              </div>
            )}
          </div>
        )}

        {clubName && (
          <div className="mt-2 text-[10px] text-muted-foreground/60">{clubName}</div>
        )}

        {isExpanded && <ExpandedSessionDetails session={session} />}
      </div>
    </div>
  );
}

function AdminControlsBar({ session, adminActions }: { session: SessionItem; adminActions: AdminActions }) {
  const canManage = adminActions.editableClubIds.has(session.clubId);
  if (!canManage) return null;

  return (
    <div className="pt-3 border-t border-border/30">
      <div className="flex items-center gap-1 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 px-2 text-xs text-muted-foreground gap-1"
              onClick={(e) => { e.stopPropagation(); adminActions.onDetails(session); }}
              data-testid={`button-rsvp-view-${session.id}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">RSVP</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>RSVP List</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 px-2 text-xs gap-1 text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); adminActions.onCrowdControl(session.id); }}
              data-testid={`button-crowd-view-${session.id}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Crowd</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Crowd Control</TooltipContent>
        </Tooltip>
        {!adminActions.isOrganiserOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg h-8 px-2 text-xs gap-1 text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); adminActions.onFinances(session); }}
                data-testid={`button-finance-view-${session.id}`}
              >
                <Wallet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Finances</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Session Finances</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 px-2 text-xs text-muted-foreground gap-1"
              onClick={(e) => { e.stopPropagation(); adminActions.onEdit(session); }}
              data-testid={`button-edit-view-${session.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit Session</TooltipContent>
        </Tooltip>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 w-8 p-0 text-muted-foreground"
              data-testid={`button-more-view-${session.id}`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); adminActions.onDuplicate(session); }}
              data-testid={`button-copy-view-${session.id}`}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Session
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); adminActions.onToggleJunior(session); }}
              data-testid={`button-toggle-junior-view-${session.id}`}
            >
              <Baby className={`h-4 w-4 mr-2 ${session.sessionType === "JUNIORS_ONLY" ? "text-emerald-500" : ""}`} />
              {session.sessionType === "JUNIORS_ONLY" ? "Move to Sessions" : "Move to Juniors"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              onClick={(e) => { e.stopPropagation(); adminActions.onDelete(session); }}
              data-testid={`button-delete-view-${session.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SessionPreviewDialog({
  session,
  clubs,
  mySignup,
  open,
  onOpenChange,
  onSignUp,
  onNavigate,
  adminActions,
}: {
  session: SessionItem;
  clubs: any[];
  mySignup?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignUp: (session: SessionItem) => void;
  onNavigate: (session: SessionItem) => void;
  adminActions?: AdminActions;
}) {
  const clubName = clubs?.find(c => c.id === session.clubId)?.name || "";
  const isSignedUp = mySignup && (mySignup.signupStatus === "CONFIRMED" || mySignup.signupStatus === "WAITING");
  const isWaiting = mySignup?.signupStatus === "WAITING";
  const isPast = new Date(session.date) < new Date(new Date().toDateString());
  const isCompleted = session.status === "COMPLETED" || session.status === "CANCELLED";
  const isLive = session.status === "ACTIVE";
  const venue = (session as any).venue;
  const venueName = venue?.name || "";
  const spotsLeft = session.maxPlayers - (session.signupCount || 0);
  const isFull = spotsLeft <= 0;
  const isScheduledLater = (session as any).publishAt && new Date((session as any).publishAt) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-session-preview">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-preview-title">
            {isLive && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />}
            {session.title}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(session.date), "EEEE, d MMMM yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium">{session.startTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{session.durationMinutes} min</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Players</p>
                <p className={`text-sm font-medium ${isFull ? "text-red-500" : ""}`}>
                  {session.signupCount || 0} / {session.maxPlayers}
                </p>
              </div>
            </div>
            {session.sessionFee != null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <PoundSterling className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fee</p>
                  <p className="text-sm font-medium">£{(session.sessionFee / 100).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {venueName && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{venueName}{venue?.city ? `, ${venue.city}` : ""}</span>
              </div>
            )}
            {clubName && (
              <div className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span>{clubName}</span>
              </div>
            )}
            {session.courtsAvailable > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Swords className="h-4 w-4 text-muted-foreground" />
                <span>{session.courtsAvailable} court{session.courtsAvailable !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {session.sessionDetails && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50" data-testid="text-session-details">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Details</p>
                <p className="text-sm whitespace-pre-line">{session.sessionDetails}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
              session.matchMode === "COMPETITIVE"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : session.matchMode === "TRAINING"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            }`}>
              {session.matchMode}
            </span>
            {session.genderRestriction === "FEMALE_ONLY" && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">Females Only</span>
            )}
            {session.sessionType === "JUNIORS_ONLY" && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Juniors</span>
            )}
            {session.allowedCategories && session.allowedCategories.length > 0 && session.allowedCategories.length < 9 && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground">
                {session.allowedCategories.join(", ")}
              </span>
            )}
            {isLive && <Badge className="bg-green-600 text-white">LIVE</Badge>}
          </div>

          {isSignedUp ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {isWaiting ? "You're on the waiting list" : "You're signed up for this session"}
                </span>
              </div>
              <Button
                className="w-full rounded-xl font-semibold"
                onClick={() => {
                  onOpenChange(false);
                  onNavigate(session);
                }}
                data-testid="button-go-to-session"
              >
                Go to Session
              </Button>
            </div>
          ) : isPast || isCompleted ? (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                onOpenChange(false);
                onNavigate(session);
              }}
              data-testid="button-view-session"
            >
              View Session
            </Button>
          ) : isScheduledLater ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              Signups not yet open
            </div>
          ) : (
            <Button
              className="w-full rounded-xl font-semibold text-base py-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              onClick={() => {
                onOpenChange(false);
                onSignUp(session);
              }}
              data-testid="button-signup-session"
            >
              <Zap className="h-5 w-5 mr-2" />
              Sign Up
            </Button>
          )}

          {adminActions && (
            <AdminControlsBar
              session={session}
              adminActions={{
                ...adminActions,
                onDetails: (s) => { onOpenChange(false); adminActions.onDetails(s); },
                onCrowdControl: (id) => { onOpenChange(false); adminActions.onCrowdControl(id); },
                onFinances: (s) => { onOpenChange(false); adminActions.onFinances(s); },
                onEdit: (s) => { onOpenChange(false); adminActions.onEdit(s); },
                onDuplicate: (s) => { onOpenChange(false); adminActions.onDuplicate(s); },
                onToggleJunior: (s) => { onOpenChange(false); adminActions.onToggleJunior(s); },
                onDelete: (s) => { onOpenChange(false); adminActions.onDelete(s); },
              }}
            />
          )}

          {adminActions?.editableClubIds.has(session.clubId) && (
            <div className="flex justify-center">
              <Link href={`/sessions/${session.id}`}>
                <Button
                  className="rounded-xl font-medium gap-2"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  data-testid={`button-start-session-view-${session.id}`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Open Session
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarView({ sessions, clubs, onSessionClick, adminActions }: SessionViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    sessions.forEach(s => {
      const key = format(new Date(s.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [sessions]);

  const selectedDaySessions = selectedDay
    ? sessionsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const today = new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-bold text-base sm:text-lg" data-testid="text-calendar-month">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                {day}
              </div>
            ))}

            {calendarDays.map((day, i) => {
              const key = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDay.get(key) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const hasLive = daySessions.some(s => s.status === "ACTIVE");

              return (
                <div
                  key={i}
                  className={`relative min-h-[52px] sm:min-h-[64px] p-1 rounded-md cursor-pointer transition-colors text-center ${
                    !isCurrentMonth ? "opacity-30" :
                    isSelected ? "bg-primary/10 ring-1 ring-primary" :
                    isToday ? "bg-accent" :
                    "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedDay(day)}
                  data-testid={`calendar-day-${key}`}
                >
                  <span className={`text-xs sm:text-sm ${isToday ? "font-bold text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {daySessions.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                      {daySessions.slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            hasLive && s.status === "ACTIVE" ? "bg-green-500" :
                            s.matchMode === "COMPETITIVE" ? "bg-red-500" :
                            s.matchMode === "TRAINING" ? "bg-amber-500" :
                            "bg-primary"
                          }`}
                        />
                      ))}
                      {daySessions.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{daySessions.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground" data-testid="text-selected-date">
            {format(selectedDay, "EEEE, d MMMM yyyy")} — {selectedDaySessions.length} session{selectedDaySessions.length !== 1 ? "s" : ""}
          </h4>
          {selectedDaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sessions on this day</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedDaySessions.map(s => (
                <SessionMiniCard key={s.id} session={s} clubs={clubs} onSessionClick={onSessionClick} adminActions={adminActions} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TimelineView({ sessions, clubs, onSessionClick, mySignupsBySession, onSignUp, adminActions }: TimelineViewProps) {
  const [previewSession, setPreviewSession] = useState<SessionItem | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const groups: { label: string; key: string; dateObj: Date; sessions: SessionItem[] }[] = [];
    const map = new Map<string, SessionItem[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sessions.forEach(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      let label: string;
      if (isSameDay(d, today)) {
        label = "Today";
      } else if (isSameDay(d, addDays(today, 1))) {
        label = "Tomorrow";
      } else {
        label = format(d, "EEEE");
      }
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({ label, key, dateObj: new Date(d), sessions: map.get(key)! });
      }
      map.get(key)!.push(s);
    });

    groups.sort((a, b) => a.key.localeCompare(b.key));
    return groups;
  }, [sessions]);

  if (sessions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sessions to display</p>;
  }

  const handleNavigate = (session: SessionItem) => {
    const mySignup = mySignupsBySession?.get(session.id);
    const isSignedUp = mySignup && (mySignup.signupStatus === "CONFIRMED" || mySignup.signupStatus === "WAITING");
    const isAdmin = adminActions?.editableClubIds.has(session.clubId);
    if (isSignedUp && !isAdmin) {
      onSessionClick(session);
    } else {
      setPreviewSession(session);
    }
  };

  const handleToggleExpand = (sessionId: number) => {
    setExpandedSessionId(prev => prev === sessionId ? null : sessionId);
  };

  let cardIdx = 0;

  return (
    <div className="relative">
      <style>{`
        @keyframes tl-fadeSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tl-dateFadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tl-nodeGlow {
          0%, 100% { box-shadow: 0 0 5px 1px hsl(var(--primary) / 0.2); }
          50% { box-shadow: 0 0 12px 3px hsl(var(--primary) / 0.4); }
        }
        @keyframes tl-nodeRingPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.15; }
        }
        @keyframes tl-railDraw {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes tl-barFill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes tl-livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(2); }
        }
        @keyframes tl-connectorFade {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 0.5; transform: scaleX(1); }
        }
        @keyframes tl-timeFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tl-card-anim {
          animation: tl-fadeSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .tl-date-anim {
          animation: tl-dateFadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .tl-time-anim {
          animation: tl-timeFadeIn 0.35s ease-out both;
        }
        .tl-node-glow {
          animation: tl-nodeGlow 3s ease-in-out infinite;
        }
        .tl-node-ring {
          animation: tl-nodeRingPulse 3s ease-in-out infinite;
        }
        .tl-rail-anim {
          animation: tl-railDraw 0.7s ease-out both;
          transform-origin: top;
        }
        .tl-bar-fill {
          animation: tl-barFill 0.8s ease-out 0.3s both;
          transform-origin: left;
        }
        .tl-connector-anim {
          animation: tl-connectorFade 0.4s ease-out both;
          transform-origin: left;
        }
        .tl-live-dot { position: relative; }
        .tl-live-dot::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: rgba(239,68,68,0.5);
          animation: tl-livePulse 1.5s ease-in-out infinite;
        }
        .tl-live-badge {
          animation: tl-livePulse 2s ease-in-out infinite;
          animation-fill-mode: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .tl-card-anim,
          .tl-date-anim,
          .tl-time-anim,
          .tl-node-glow,
          .tl-node-ring,
          .tl-rail-anim,
          .tl-connector-anim { animation: none; }
          .tl-bar-fill { animation: none; transform: scaleX(1); }
          .tl-live-dot::before { animation: none; }
          .tl-live-badge { animation: none; }
        }
      `}</style>

      <div className="space-y-0">
        {grouped.map((group, gi) => {
          const isToday = group.label === "Today";
          const isTomorrow = group.label === "Tomorrow";
          const isPast = group.dateObj < new Date(new Date().toDateString());
          const day = format(group.dateObj, "d");
          const month = format(group.dateObj, "MMM").toUpperCase();
          const year = format(group.dateObj, "yyyy");
          const sortedSessions = [...group.sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div key={group.key} className="relative" data-testid={`timeline-group-${group.key}`}>
              <div className="flex items-stretch">
                <div className="flex flex-col items-center flex-shrink-0 w-[56px] sm:w-[72px]">
                  <div className={`tl-date-anim flex flex-col items-center rounded-xl px-1.5 py-2.5 w-full ${
                    isToday ? "bg-primary/10 ring-1 ring-primary/30" :
                    isTomorrow ? "bg-blue-500/10 ring-1 ring-blue-500/30" :
                    isPast ? "bg-muted/40" :
                    "bg-card border border-border/40"
                  }`} style={{ animationDelay: `${gi * 80}ms` }}>
                    <span className={`text-[22px] sm:text-[28px] font-black leading-none tabular-nums ${
                      isToday ? "text-primary" :
                      isTomorrow ? "text-blue-500" :
                      isPast ? "text-muted-foreground/60 dark:text-muted-foreground/50" :
                      "text-foreground dark:text-white"
                    }`}>{day}</span>
                    <span className={`text-[10px] font-bold tracking-widest mt-0.5 ${
                      isToday ? "text-primary" :
                      isTomorrow ? "text-blue-500" :
                      isPast ? "text-muted-foreground/50 dark:text-muted-foreground/40" :
                      "text-muted-foreground dark:text-muted-foreground"
                    }`}>{month}</span>
                    <span className="text-[9px] text-muted-foreground/40 dark:text-muted-foreground/50">{year}</span>
                  </div>

                  {sortedSessions.map((s, si) => {
                    const durLabel = s.durationMinutes >= 60
                      ? `${Math.floor(s.durationMinutes / 60)}h${s.durationMinutes % 60 > 0 ? `${s.durationMinutes % 60}m` : ""}`
                      : `${s.durationMinutes}m`;
                    return (
                      <div key={s.id} className={`tl-time-anim flex flex-col items-center w-full ${si === 0 ? "mt-6" : "mt-[26px]"}`} style={{ animationDelay: `${gi * 80 + (si + 1) * 100}ms` }}>
                        <span className={`text-sm sm:text-[15px] font-bold tabular-nums leading-tight ${
                          isPast ? "text-muted-foreground/50 dark:text-muted-foreground/40" : "text-foreground dark:text-white"
                        }`}>{s.startTime}</span>
                        <span className={`text-[10px] sm:text-[11px] tabular-nums leading-tight mt-0.5 px-1.5 py-0.5 rounded-md ${
                          isPast ? "text-muted-foreground/40 dark:text-muted-foreground/35" : "text-muted-foreground dark:text-muted-foreground/90 bg-muted/40 dark:bg-muted/50"
                        }`}>{durLabel}</span>
                      </div>
                    );
                  })}

                  {gi < grouped.length - 1 && (
                    <div className={`w-[2px] flex-1 mt-2 rounded-full tl-rail-anim ${
                      isPast ? "bg-border/25" : "bg-gradient-to-b from-primary/30 to-primary/10"
                    }`} style={{ animationDelay: `${gi * 100}ms` }} />
                  )}
                </div>

                <div className="flex flex-col flex-shrink-0 w-6 sm:w-10 items-center pt-4">
                  <div className="relative flex-shrink-0">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                      isToday ? "bg-primary border-primary tl-node-glow" :
                      isTomorrow ? "bg-blue-500 border-blue-500 tl-node-glow" :
                      isPast ? "bg-muted-foreground/25 border-muted-foreground/20" :
                      "bg-primary/60 border-primary/50 tl-node-glow"
                    }`} />
                    <div className={`absolute inset-[-3px] rounded-full border ${
                      isPast ? "border-muted-foreground/10" : "border-primary/20 tl-node-ring"
                    }`} />
                  </div>

                  {sortedSessions.length > 1 && (
                    <div className={`w-[2px] flex-1 mt-1 rounded-full ${
                      isPast ? "bg-border/20" : "bg-primary/15"
                    }`} />
                  )}
                </div>

                <div className="flex-1 min-w-0 pb-6 sm:pb-8">
                  <div className="flex items-center gap-2 mb-3 pt-2.5">
                    <div className={`hidden sm:block w-6 h-px tl-connector-anim ${isPast ? "bg-border/30" : "bg-primary/25"}`} style={{ animationDelay: `${gi * 80 + 50}ms` }} />
                    <h3 className={`font-bold text-sm ${
                      isToday ? "text-primary" :
                      isTomorrow ? "text-blue-500" :
                      isPast ? "text-muted-foreground" :
                      "text-foreground"
                    }`}>
                      {group.label}
                    </h3>
                    <Badge variant="outline" className="text-[10px] h-5 font-medium">
                      {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {sortedSessions.map((s) => {
                      const idx = cardIdx++;

                      return (
                        <div key={s.id} className="flex items-start gap-0 group/card">
                          <div className="hidden sm:flex items-center flex-shrink-0 pt-5 mr-1">
                            <div className={`w-5 h-px tl-connector-anim ${isPast ? "bg-border/25" : "bg-primary/20"}`} />
                          </div>

                          <div className="flex-1 min-w-0 tl-card-anim" style={{ animationDelay: `${idx * 70}ms` }}>
                            <TimelineSessionCard
                              session={s}
                              clubs={clubs}
                              mySignup={mySignupsBySession?.get(s.id)}
                              isExpanded={expandedSessionId === s.id}
                              onToggleExpand={() => handleToggleExpand(s.id)}
                              onNavigate={() => handleNavigate(s)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewSession && (
        <SessionPreviewDialog
          session={previewSession}
          clubs={clubs}
          mySignup={mySignupsBySession?.get(previewSession.id)}
          open={!!previewSession}
          onOpenChange={(open) => { if (!open) setPreviewSession(null); }}
          onSignUp={(s) => {
            setPreviewSession(null);
            if (onSignUp) onSignUp(s);
          }}
          onNavigate={(s) => {
            setPreviewSession(null);
            onSessionClick(s);
          }}
          adminActions={adminActions}
        />
      )}
    </div>
  );
}

export function GroupedView({ sessions, clubs, onSessionClick, adminActions }: SessionViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const titleMap = new Map<string, SessionItem[]>();

    sessions.forEach(s => {
      const normalizedTitle = s.title.trim().toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s*[-–]\s*week\s*\d+/i, "")
        .replace(/\s*#\d+/i, "")
        .replace(/\s*\d{1,2}[\/\-]\d{1,2}/i, "");

      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle)!.push(s);
    });

    const result = Array.from(titleMap.entries()).map(([key, sessions]) => {
      const sorted = sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const displayTitle = sorted[0].title;
      const clubIds = [...new Set(sorted.map(s => s.clubId))];
      const clubNames = clubIds.map(id => clubs?.find(c => c.id === id)?.name || "").filter(Boolean);
      const isRecurring = sorted.length > 1;

      const nextSession = sorted.find(s => new Date(s.date) >= new Date(new Date().toDateString()));
      const totalSignups = sorted.reduce((sum, s) => sum + (s.signupCount || 0), 0);

      let dayPattern = "";
      if (isRecurring && sorted.length >= 2) {
        const days = sorted.map(s => format(new Date(s.date), "EEEE"));
        const uniqueDays = [...new Set(days)];
        if (uniqueDays.length === 1) {
          dayPattern = `Every ${uniqueDays[0]}`;
        } else if (uniqueDays.length <= 3) {
          dayPattern = uniqueDays.join(" & ");
        }
      }

      return {
        key,
        displayTitle,
        sessions: sorted,
        clubNames,
        isRecurring,
        nextSession,
        totalSignups,
        dayPattern,
        upcomingCount: sorted.filter(s => new Date(s.date) >= new Date(new Date().toDateString())).length,
        pastCount: sorted.filter(s => new Date(s.date) < new Date(new Date().toDateString())).length,
      };
    });

    result.sort((a, b) => {
      const aNext = a.nextSession ? new Date(a.nextSession.date).getTime() : Infinity;
      const bNext = b.nextSession ? new Date(b.nextSession.date).getTime() : Infinity;
      return aNext - bNext;
    });

    return result;
  }, [sessions, clubs]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (sessions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sessions to display</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.key);

        return (
          <Card key={group.key} className="border-border/50" data-testid={`session-group-${group.key}`}>
            <CardContent className="p-0">
              <div
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleGroup(group.key)}
                data-testid={`button-toggle-group-${group.key}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-base truncate">{group.displayTitle}</h3>
                    {group.isRecurring && (
                      <Badge variant="secondary" className="text-xs">
                        <Layers className="h-3 w-3 mr-1" />
                        {group.sessions.length}x
                      </Badge>
                    )}
                    {group.clubNames.map((name, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {group.dayPattern && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {group.dayPattern}
                      </span>
                    )}
                    {group.nextSession && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next: {format(new Date(group.nextSession.date), "EEE, d MMM")} at {group.nextSession.startTime}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.totalSignups} total signups
                    </span>
                    {group.upcomingCount > 0 && (
                      <Badge variant="outline" className="text-[10px]">{group.upcomingCount} upcoming</Badge>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>

              {isExpanded && (
                <div className="border-t px-3 sm:px-4 py-2 space-y-2">
                  {group.sessions.map(s => {
                    const isPast = new Date(s.date) < new Date(new Date().toDateString());
                    const isLive = s.status === "ACTIVE";

                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                          isLive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
                          isPast ? "border-border/30 opacity-60" :
                          "border-border/50 hover:border-primary/30"
                        }`}
                        onClick={() => onSessionClick(s)}
                        data-testid={`grouped-session-${s.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                          <div className="min-w-0">
                            <span className="font-medium text-sm">
                              {format(new Date(s.date), "EEE, d MMM")}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>{s.startTime}</span>
                              <span>·</span>
                              <span>{s.signupCount || 0}/{s.maxPlayers} players</span>
                              {s.sessionFee != null && (
                                <>
                                  <span>·</span>
                                  <span>£{(s.sessionFee / 100).toFixed(2)}</span>
                                </>
                              )}
                              {(s as any).venue?.name && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {(s as any).venue.name}{(s as any).venue.city ? `, ${(s as any).venue.city}` : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLive && <Badge className="bg-green-600 text-white text-[10px]">LIVE</Badge>}
                          {isPast && <Badge variant="outline" className="text-[10px]">Past</Badge>}
                          {adminActions?.editableClubIds.has(s.clubId) && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); adminActions.onDetails(s); }} data-testid={`button-rsvp-grouped-${s.id}`}>
                                    <Users className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>RSVP List</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); adminActions.onEdit(s); }} data-testid={`button-edit-grouped-${s.id}`}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={(e) => e.stopPropagation()} data-testid={`button-more-grouped-${s.id}`}>
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); adminActions.onCrowdControl(s.id); }}>
                                    <BarChart3 className="h-4 w-4 mr-2" />Crowd Control
                                  </DropdownMenuItem>
                                  {!adminActions.isOrganiserOnly && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); adminActions.onFinances(s); }}>
                                      <Wallet className="h-4 w-4 mr-2" />Finances
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); adminActions.onDuplicate(s); }}>
                                    <Copy className="h-4 w-4 mr-2" />Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); adminActions.onToggleJunior(s); }}>
                                    <Baby className={`h-4 w-4 mr-2 ${s.sessionType === "JUNIORS_ONLY" ? "text-emerald-500" : ""}`} />
                                    {s.sessionType === "JUNIORS_ONLY" ? "Move to Sessions" : "Move to Juniors"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={(e) => { e.stopPropagation(); adminActions.onDelete(s); }}>
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                          <Link href={`/sessions/${s.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs" data-testid={`button-view-grouped-${s.id}`}>
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
