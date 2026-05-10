import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PoundSterling, Layers, CheckCircle, CheckCircle2, Zap, Timer, Swords, BarChart3, Wallet, Pencil, Copy, Baby, Trash2, MoreVertical, ArrowRight, FileText, Trophy, Target, Building2, Bell, ShieldCheck, ShieldX, CircleDollarSign, Flame, Brain, Snowflake, Activity, Crown, Flag, PartyPopper, Dumbbell, Heart, Ban, RefreshCw, AlertTriangle, Megaphone, Info, ExternalLink, Link as LinkIcon, X } from "lucide-react";
import { Link } from "wouter";
import { SessionTeamBadges } from "@/components/session/SessionTeamBadges";

const SESSION_BANNER_COLORS = {
  red:    { bar: "bg-red-500 dark:bg-red-600",       text: "text-white", icon: AlertTriangle },
  amber:  { bar: "bg-amber-500 dark:bg-amber-500",   text: "text-white", icon: AlertTriangle },
  blue:   { bar: "bg-blue-500 dark:bg-blue-600",     text: "text-white", icon: Info },
  green:  { bar: "bg-emerald-500 dark:bg-emerald-600", text: "text-white", icon: CheckCircle },
  purple: { bar: "bg-purple-500 dark:bg-purple-600", text: "text-white", icon: Megaphone },
  pink:   { bar: "bg-pink-500 dark:bg-pink-600",     text: "text-white", icon: Megaphone },
} as const;

function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={`${keyPrefix}-b-${i++}`} className="font-bold">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function FormattedBannerText({ text, keyPrefix = "fmt" }: { text: string; keyPrefix?: string }) {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={`${keyPrefix}-ul-${blocks.length}`} className="list-disc pl-5 space-y-0.5">
        {bulletBuffer.map((b, i) => (
          <li key={i}>{renderInlineFormatting(b, `${keyPrefix}-li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const bulletMatch = /^\s*(?:[-*•])\s+(.*)$/.exec(line);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      return;
    }
    flushBullets();
    if (line.trim() === "") {
      blocks.push(<div key={`${keyPrefix}-sp-${idx}`} className="h-1.5" />);
      return;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) {
      blocks.push(<div key={`${keyPrefix}-h1-${idx}`} className="text-base font-bold leading-snug">{renderInlineFormatting(h1[1], `${keyPrefix}-h1in-${idx}`)}</div>);
    } else if (h2) {
      blocks.push(<div key={`${keyPrefix}-h2-${idx}`} className="text-sm font-bold leading-snug">{renderInlineFormatting(h2[1], `${keyPrefix}-h2in-${idx}`)}</div>);
    } else {
      blocks.push(<p key={`${keyPrefix}-p-${idx}`} className="leading-snug m-0">{renderInlineFormatting(line, `${keyPrefix}-pin-${idx}`)}</p>);
    }
  });
  flushBullets();
  return <div className="space-y-1">{blocks}</div>;
}

export function SessionBanner({ message, color, sessionId, variant = "card" }: { message: string; color?: string | null; sessionId: number; variant?: "card" | "modal" }) {
  if (!message) return null;
  const palette = (color && SESSION_BANNER_COLORS[color as keyof typeof SESSION_BANNER_COLORS]) || SESSION_BANNER_COLORS.blue;
  const Icon = palette.icon;
  const radius = variant === "card" ? "rounded-t-xl" : "rounded-lg";
  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2.5 text-sm font-semibold ${palette.bar} ${palette.text} ${radius} shadow-sm`}
      data-testid={`session-banner-${sessionId}`}
      role="status"
    >
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0 break-words">
        <FormattedBannerText text={message} keyPrefix={`banner-${sessionId}`} />
      </div>
    </div>
  );
}

function isSafeHttpUrl(url: string): { ok: boolean; href: string } {
  try {
    const trimmed = (url || "").trim();
    if (!trimmed) return { ok: false, href: "#" };
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, href: "#" };
    return { ok: true, href: parsed.toString() };
  } catch {
    return { ok: false, href: "#" };
  }
}

export function UsefulLinks({ links, sessionId, compact = false }: { links?: { title: string; url: string }[] | null; sessionId: number; compact?: boolean }) {
  if (!links || !Array.isArray(links) || links.length === 0) return null;
  const valid = links.filter(l => l && l.title && l.url);
  if (valid.length === 0) return null;
  return (
    <div className="rounded-lg border border-blue-300/60 dark:border-blue-700/50 bg-blue-50/70 dark:bg-blue-950/30 p-2.5" data-testid={`useful-links-${sessionId}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1.5">
        <LinkIcon className="h-3 w-3" />
        Useful Links
      </div>
      <div className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-1 sm:grid-cols-2 gap-1.5"}>
        {valid.map((link, idx) => {
          const { ok, href } = isSafeHttpUrl(link.url);
          if (!ok) return null;
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              data-testid={`link-useful-${sessionId}-${idx}`}
            >
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{link.title}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

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
  premiumFee?: number | null;
  superPremiumFee?: number | null;
  clubMemberFee?: number | null;
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
  onRemindMembers?: (sessionId: number) => void;
  onCancel?: (session: SessionItem) => void;
  onReactivate?: (session: SessionItem) => void;
  onEndSession?: (session: SessionItem) => void;
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
  onWithdraw?: (sessionId: number) => void;
};

const TEAM_EVENT_TYPES: Record<string, { label: string; icon: typeof Flag; color: string }> = {
  SOCIAL: { label: "Social", icon: PartyPopper, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  MATCH: { label: "Match", icon: Trophy, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  TOURNAMENT_PREP: { label: "Tournament Prep", icon: Flag, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  TRAINING: { label: "Training", icon: Dumbbell, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  FUNDRAISER: { label: "Fundraiser", icon: Heart, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  OTHER: { label: "Other", icon: CalendarIcon, color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
};

function getTeamEventTypeInfo(type: string) {
  return TEAM_EVENT_TYPES[type] || TEAM_EVENT_TYPES.OTHER;
}

function SessionMiniCard({ session, clubs, onSessionClick, adminActions }: { session: SessionItem; clubs: any[]; onSessionClick: (s: SessionItem) => void; adminActions?: AdminActions }) {
  const clubName = clubs?.find(c => c.id === session.clubId)?.name || "";
  const isPast = new Date(session.date) < new Date();
  const isLive = session.status === "ACTIVE";
  const venue = (session as any).venue;
  const venueName = venue?.name || "";
  const isTeamEvent = !!(session as any).isTeamEvent;

  if (isTeamEvent) {
    const typeInfo = getTeamEventTypeInfo((session as any).eventType || "OTHER");
    const TypeIcon = typeInfo.icon;
    return (
      <div
        className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-400/70`}
        onClick={() => onSessionClick(session)}
        data-testid={`team-event-mini-${session.id}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[9px] font-bold border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0">
            <Flag className="h-2.5 w-2.5 mr-0.5" /> EVENT
          </Badge>
          <Badge className={`text-[9px] px-1.5 py-0 ${typeInfo.color}`}>
            <TypeIcon className="h-2.5 w-2.5 mr-0.5" /> {typeInfo.label}
          </Badge>
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
          {(session as any).location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{(session as any).location}</span>
            </span>
          )}
          {clubName && <span className="truncate font-semibold text-blue-600 dark:text-blue-400">{clubName}</span>}
        </div>
      </div>
    );
  }

  const isCancelled = session.status === "CANCELLED";

  return (
    <div
      className={`rounded-lg border cursor-pointer transition-all hover:shadow-sm overflow-hidden ${
        isCancelled ? "border-orange-300 dark:border-orange-700/60 bg-muted/40 dark:bg-muted/20 grayscale-[0.6] opacity-80" :
        isLive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
        isPast ? "border-border/30 opacity-70" :
        "border-border/50 hover:border-primary/30"
      }`}
      onClick={() => onSessionClick(session)}
      data-testid={`session-mini-${session.id}`}
    >
      {isCancelled && (
        <div className="flex items-center justify-center gap-2 bg-orange-500 dark:bg-orange-600 text-white px-2 py-2 text-base font-extrabold uppercase tracking-[0.25em]" data-testid={`banner-cancelled-mini-${session.id}`}>
          <Ban className="h-5 w-5" />
          <span>Cancelled</span>
          <Ban className="h-5 w-5" />
        </div>
      )}
      <div className="p-2.5">
      <div className="flex items-center gap-2 mb-1">
        {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
        <span className={`font-semibold text-sm truncate ${isCancelled ? "line-through text-muted-foreground" : ""}`}>{session.title}</span>
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
        {!venueName && clubName && <span className="truncate font-semibold text-blue-600 dark:text-blue-400">{clubName}</span>}
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
          {adminActions.onRemindMembers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => adminActions.onRemindMembers!(session.id)} data-testid={`button-remind-mini-${session.id}`}>
                  <Bell className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remind Members</TooltipContent>
            </Tooltip>
          )}
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" data-testid={`button-more-mini-${session.id}`}>
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => adminActions.onDetails(session)}>
                <Users className="h-4 w-4 mr-2" />RSVP List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => adminActions.onEdit(session)}>
                <Pencil className="h-4 w-4 mr-2" />Edit Session
              </DropdownMenuItem>
              {adminActions.onRemindMembers && (
                <DropdownMenuItem onClick={() => adminActions.onRemindMembers!(session.id)}>
                  <Bell className="h-4 w-4 mr-2" />Remind Members
                </DropdownMenuItem>
              )}
              {!adminActions.isOrganiserOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => adminActions.onFinances(session)}>
                    <Wallet className="h-4 w-4 mr-2" />Finances
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => adminActions.onDuplicate(session)}>
                <Copy className="h-4 w-4 mr-2" />Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => adminActions.onToggleJunior(session)}>
                <Baby className={`h-4 w-4 mr-2 ${session.sessionType === "JUNIORS_ONLY" ? "text-emerald-500" : ""}`} />
                {session.sessionType === "JUNIORS_ONLY" ? "Move to Sessions" : "Move to Juniors"}
              </DropdownMenuItem>
              {(adminActions.onCancel || adminActions.onReactivate) && (
                <>
                  <DropdownMenuSeparator />
                  {session.status === "CANCELLED" ? (
                    adminActions.onReactivate && (
                      <DropdownMenuItem onClick={() => adminActions.onReactivate!(session)} data-testid={`button-reactivate-mini-${session.id}`}>
                        <RefreshCw className="h-4 w-4 mr-2 text-emerald-500" />Reactivate Session
                      </DropdownMenuItem>
                    )
                  ) : (
                    adminActions.onCancel && (
                      <DropdownMenuItem className="text-amber-600 dark:text-amber-400 focus:text-amber-600 dark:focus:text-amber-400" onClick={() => adminActions.onCancel!(session)} data-testid={`button-cancel-mini-${session.id}`}>
                        <Ban className="h-4 w-4 mr-2" />Cancel Session
                      </DropdownMenuItem>
                    )
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => adminActions.onDelete(session)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      </div>
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

function getSessionHype(session: SessionItem, leaderboard?: any[]): { icon: typeof Flame; message: string; color: string; priority: number } | null {
  const energy = computeEnergyScore(session);
  if (leaderboard && leaderboard.length > 0) {
    const streakPlayers = leaderboard.filter((p: any) => (p.winStreak || 0) >= 2);
    if (energy > 70) return { icon: Flame, message: "High energy session expected", color: "text-orange-500", priority: 1 };
    if (streakPlayers.length > 0) return { icon: Zap, message: `${streakPlayers.length} player${streakPlayers.length > 1 ? "s" : ""} on a win streak`, color: "text-amber-500", priority: 2 };
    const avgWinRate = leaderboard.reduce((s: number, p: any) => s + (p.winPercentage || 0), 0) / leaderboard.length;
    const ratings = leaderboard.map((p: any) => p.rating || p.winPercentage || 0);
    const ratingVariance = ratings.length > 1 ? Math.sqrt(ratings.reduce((s, r) => s + Math.pow(r - ratings.reduce((a, b) => a + b, 0) / ratings.length, 2), 0) / ratings.length) : 0;
    if (ratingVariance < 15 && leaderboard.length >= 4) return { icon: Brain, message: "Balanced matchmaking", color: "text-blue-500", priority: 3 };
    if (avgWinRate < 40) return { icon: Snowflake, message: "Chill social session", color: "text-cyan-500", priority: 4 };
  }
  if (energy > 70) return { icon: Flame, message: "High energy session expected", color: "text-orange-500", priority: 1 };
  if (energy < 30) return { icon: Snowflake, message: "Chill social session", color: "text-cyan-500", priority: 4 };
  return null;
}

function getSessionLiveStatus(session: SessionItem): "past" | "live" | "upcoming" {
  const now = new Date();
  const sessionDate = new Date(session.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sessionDate.setHours(0, 0, 0, 0);
  if (sessionDate.getTime() < today.getTime()) return "past";
  if (sessionDate.getTime() > today.getTime()) return "upcoming";
  const [sh, sm] = session.startTime.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = startMin + session.durationMinutes;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < startMin) return "upcoming";
  if (nowMin <= endMin) return "live";
  return "past";
}

function useCurrentTime(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
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

function ExpandedSessionDetails({ session, clubs, mySignup, onSignUp, onWithdraw, onNavigate, adminActions }: { session: SessionItem; clubs?: any[]; mySignup?: any; onSignUp?: (session: SessionItem) => void; onWithdraw?: (sessionId: number) => void; onNavigate: () => void; adminActions?: AdminActions }) {
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
  const matchesPlayed = leaderboard?.length ? leaderboard.reduce((max: number, p: any) => Math.max(max, p.matchesPlayed || 0), 0) : 0;
  const avgDifficulty = leaderboard?.length
    ? (leaderboard.reduce((sum: number, p: any) => sum + (p.winPercentage || 0), 0) / leaderboard.length / 10).toFixed(1)
    : null;

  const isLoading = signupsLoading || leaderboardLoading;
  const hasError = signupsError || leaderboardError;

  const energyScore = computeEnergyScore(session);
  const hype = getSessionHype(session, leaderboard || undefined);
  const topPlayer = leaderboard && leaderboard.length > 0 ? leaderboard.reduce((best: any, p: any) => (!best || (p.winPercentage || 0) > (best.winPercentage || 0)) ? p : best, null) : null;
  const avgWinRate = leaderboard && leaderboard.length > 0 ? Math.round(leaderboard.reduce((s: number, p: any) => s + (p.winPercentage || 0), 0) / leaderboard.length) : null;
  const matchCount = leaderboard && leaderboard.length > 0
    ? Math.round(leaderboard.reduce((sum: number, p: any) => sum + (p.matchesPlayed || 0), 0) / 4)
    : 0;

  return (
    <div
      className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: height > 0 ? `${height + 16}px` : "600px" }}
      role="region"
      aria-label={`Details for ${session.title || "session"}`}
      id={`session-details-${session.id}`}
    >
      <div ref={contentRef} className="pt-3">
        <div className="h-px tl-gradient-divider mb-3" />

        <div className="tl-dropdown-panel rounded-2xl p-3 space-y-3 mb-3">

          <div className="flex items-center gap-2" data-testid={`expanded-energy-${session.id}`}>
            <Activity className={`h-3.5 w-3.5 flex-shrink-0 ${energyScore > 70 ? "text-orange-500" : energyScore > 40 ? "text-amber-500" : "text-blue-500"}`} />
            <div className="flex-1 h-2.5 rounded-full bg-muted/30 dark:bg-white/5 overflow-hidden max-w-[140px] tl-energy-track">
              <div
                className={`h-full rounded-full tl-energy-bar ${
                  energyScore > 70 ? "bg-gradient-to-r from-orange-500 to-red-500" : energyScore > 40 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-blue-400 to-cyan-500"
                }`}
                style={{ "--energy-width": `${energyScore}%` } as React.CSSProperties}
              />
            </div>
            <span className={`text-[10px] font-bold tabular-nums ${energyScore > 70 ? "text-orange-500" : energyScore > 40 ? "text-amber-500" : "text-blue-500"}`}>
              {energyScore}/100
            </span>
          </div>

          {hype && (
            <div className="tl-insight-card rounded-xl px-3 py-2" data-testid={`expanded-hype-${session.id}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/75">Session Insight</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <hype.icon className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-semibold">{hype.message}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="font-semibold text-foreground dark:text-white/80">{session.signupCount || 0} Player{(session.signupCount || 0) !== 1 ? "s" : ""}</span>
            </div>
            {matchCount > 0 && (
              <div className="flex items-center gap-1">
                <Swords className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold text-foreground dark:text-white/80">{matchCount} Match{matchCount !== 1 ? "es" : ""}</span>
              </div>
            )}
            {matchCount > 0 && (session.signupCount || 0) > 1 && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-orange-500" />
                <span className="font-semibold text-foreground dark:text-white/80">Avg {Math.min(10, (matchCount / (session.signupCount || 1) * 5)).toFixed(1)} Difficulty</span>
              </div>
            )}
          </div>
        </div>

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

            {(topPlayer || avgWinRate !== null) && (
              <div className="tl-section-card rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy className="h-3 w-3 text-amber-500 tl-section-icon" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Player Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {topPlayer && (
                    <div className="tl-stat-card rounded-lg px-2.5 py-2 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">🏆 Top Player</span>
                      <p className="text-xs font-bold text-foreground dark:text-white mt-0.5 truncate">{topPlayer.fullName || "Player"}</p>
                      <p className="text-[10px] text-muted-foreground">{topPlayer.winPercentage != null ? `${Math.round(topPlayer.winPercentage)}% WR` : `${topPlayer.matchesWon || 0}W`}</p>
                    </div>
                  )}
                  {avgWinRate !== null && (
                    <div className="tl-stat-card rounded-lg px-2.5 py-2 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">📊 Avg Win Rate</span>
                      <p className="text-lg font-bold text-foreground dark:text-white mt-0.5">{avgWinRate}%</p>
                      <p className="text-[10px] text-muted-foreground">{leaderboard?.length || 0} players</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {matchCount > 0 && (
              <div className="tl-section-card rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Swords className="h-3 w-3 text-emerald-500 tl-section-icon" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match Insights</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="tl-stat-card rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-foreground dark:text-white">{matchesPlayed}</span>
                    <p className="text-[9px] text-muted-foreground">Matches</p>
                  </div>
                  <div className="tl-stat-card rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-foreground dark:text-white">{leaderboard?.length || 0}</span>
                    <p className="text-[9px] text-muted-foreground">Ranked</p>
                  </div>
                  {avgDifficulty && (
                    <div className="tl-stat-card rounded-lg p-2 text-center">
                      <span className="text-lg font-bold text-foreground dark:text-white">{avgDifficulty}</span>
                      <p className="text-[9px] text-muted-foreground">Difficulty</p>
                    </div>
                  )}
                </div>
                {session.matchMode && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">🔁 Mode:</span>
                    <span className={`text-[10px] font-semibold ${session.matchMode === "COMPETITIVE" ? "text-red-500" : session.matchMode === "TRAINING" ? "text-violet-500" : "text-blue-500"}`}>
                      {session.matchMode}
                    </span>
                  </div>
                )}
              </div>
            )}

            {leaderboard && leaderboard.length > 0 && (
              <div className="tl-section-card rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Trophy className="h-3 w-3 text-amber-500 tl-section-icon" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leaderboard</span>
                </div>
                <div className="space-y-1">
                  {leaderboard.slice(0, 3).map((p: any, i: number) => (
                    <div key={p.profileId || i} className={`flex items-center justify-between tl-stat-card rounded-md px-2.5 py-1.5 ${i === 0 ? "tl-crown-card" : ""}`} data-testid={`expanded-rank-${i}`}>
                      <div className="flex items-center gap-2">
                        {i === 0 ? (
                          <Crown className="h-4 w-4 text-amber-400 tl-crown-icon flex-shrink-0" />
                        ) : (
                          <span className={`text-[11px] font-bold w-4 text-center ${i === 1 ? "text-gray-400" : "text-amber-700"}`}>
                            {i === 1 ? "🥈" : "🥉"}
                          </span>
                        )}
                        <span className={`text-[11px] ${i === 0 ? "font-bold text-amber-600 dark:text-amber-400" : "text-foreground dark:text-white/80"}`}>{p.fullName || "Player"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="text-emerald-500">{p.matchesWon || 0}W</span>
                        <span className="text-red-400">{p.matchesLost || 0}L</span>
                        <span className="font-medium text-foreground dark:text-white/70">{p.matchesPlayed || 0}P</span>
                      </div>
                    </div>
                  ))}
                </div>
                {leaderboard.length > 0 && (
                  <div className="tl-challenge-banner mt-2 rounded-lg px-3 py-2" data-testid="challenge-banner">
                    <div className="flex items-start gap-2">
                      <Crown className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5 tl-crown-icon" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {leaderboard[0].fullName || "Top player"} holds the crown!
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Think you can dethrone the leader? Join this session and claim the top spot!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(session.sessionFee != null || session.premiumFee != null || session.superPremiumFee != null || session.clubMemberFee != null) && (
              <div className="tl-section-card rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <PoundSterling className="h-3 w-3 text-emerald-500 tl-section-icon" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Fees</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {session.sessionFee != null && (
                    <div className="tl-stat-card rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Standard</span>
                      <span className="text-[11px] font-bold text-foreground dark:text-white">£{(session.sessionFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {session.premiumFee != null && (
                    <div className="tl-stat-card rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Premium</span>
                      <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">£{(session.premiumFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {session.superPremiumFee != null && (
                    <div className="tl-stat-card rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Super Premium</span>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">£{(session.superPremiumFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {session.clubMemberFee != null && (
                    <div className="tl-stat-card rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Club Member</span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">£{(session.clubMemberFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(session as any).sessionDetails && (
              <div data-testid={`session-notes-${session.id}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Session Notes</span>
                </div>
                <div className="relative rounded-lg border-l-4 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 shadow-sm">
                  <p className="text-[12px] leading-relaxed text-amber-900 dark:text-amber-100 whitespace-pre-line">
                    {(session as any).sessionDetails}
                  </p>
                </div>
              </div>
            )}

            <UsefulLinks links={(session as any).customLinks} sessionId={session.id} />

            {(() => {
              const club = clubs?.find(c => c.id === session.clubId);
              if (!club?.bankAccountName) return null;
              return (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Building2 className="h-3 w-3 text-muted-foreground/70" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Payment Details</span>
                  </div>
                  <div className="bg-muted/25 dark:bg-muted/15 rounded-md px-2.5 py-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium text-foreground dark:text-white/80">{club.bankAccountName}</span>
                    </div>
                    {club.bankSortCode && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Sort Code</span>
                        <span className="font-medium text-foreground dark:text-white/80">{club.bankSortCode}</span>
                      </div>
                    )}
                    {club.bankAccountNumber && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Account Number</span>
                        <span className="font-medium text-foreground dark:text-white/80">{club.bankAccountNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-1 flex gap-2">
              {(() => {
                const isPast = new Date(session.date) < new Date(new Date().toDateString());
                const isSignedUp = mySignup && (mySignup.signupStatus === "CONFIRMED" || mySignup.signupStatus === "WAITING");
                const isWaiting = mySignup?.signupStatus === "WAITING";
                const isFull = (session.signupCount || 0) >= session.maxPlayers;

                if (isSignedUp) {
                  return (
                    <>
                      <Button size="sm" variant="outline" className={`flex-1 h-8 text-xs cursor-default ${isWaiting ? "border-amber-400/50 text-amber-600 dark:text-amber-400" : "border-emerald-400/50 text-emerald-600 dark:text-emerald-400"}`} disabled data-testid={`button-joined-${session.id}`}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        {isWaiting ? "On Waitlist" : "Joined"}
                      </Button>
                      {onWithdraw && !isPast && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-red-400/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Withdraw from "${session.title}"? Your spot will be released and may be given to someone on the waitlist.`)) {
                              onWithdraw(session.id);
                            }
                          }}
                          data-testid={`button-withdraw-${session.id}`}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Withdraw
                        </Button>
                      )}
                    </>
                  );
                }
                if (!isPast && onSignUp) {
                  return (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={(e) => { e.stopPropagation(); onSignUp(session); }}
                      data-testid={`button-join-session-${session.id}`}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      {isFull ? "Join Waitlist" : "Join Session"}
                    </Button>
                  );
                }
                return null;
              })()}
              <Button size="sm" variant="outline" className={`${(!mySignup && !onSignUp) || new Date(session.date) < new Date(new Date().toDateString()) ? "flex-1" : ""} h-8 text-xs`} onClick={(e) => { e.stopPropagation(); onNavigate(); }} data-testid={`button-view-session-${session.id}`}>
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                View Session
              </Button>
            </div>

            {adminActions && (
              <AdminControlsBar session={session} adminActions={adminActions} />
            )}
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
  onSignUp,
  onWithdraw,
  adminActions,
}: {
  session: SessionItem;
  clubs: any[];
  mySignup?: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
  onSignUp?: (session: SessionItem) => void;
  onWithdraw?: (sessionId: number) => void;
  adminActions?: AdminActions;
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

  const intensity = getIntensityLevel(session);
  const isElite = intensity.label === "ELITE";
  useCurrentTime(60000);
  const liveStatus = getSessionLiveStatus(session);
  const isRealTimeLive = liveStatus === "live";
  const isRealTimePast = liveStatus === "past";
  const isCancelled = session.status === "CANCELLED";
  const energyScore = computeEnergyScore(session);
  const hype = getSessionHype(session);

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

  if ((session as any).isTeamEvent) {
    const teTypeInfo = getTeamEventTypeInfo((session as any).eventType || "OTHER");
    const TeTypeIcon = teTypeInfo.icon;
    const teEventDate = new Date(session.date);
    const teLiveStatus = (() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eDay = new Date(teEventDate.getFullYear(), teEventDate.getMonth(), teEventDate.getDate());
      if (eDay.getTime() === today.getTime()) return "live";
      if (eDay > today) return "upcoming";
      return "past";
    })();
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); handleCardClick(); } }}
        className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none group ${
          teLiveStatus === "past" ? "opacity-55" : ""
        } ${isExpanded ? "shadow-lg" : "hover:-translate-y-[3px]"}`}
        data-testid={`timeline-team-event-${session.id}`}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />

        <div className={`p-4 pl-5 border rounded-xl backdrop-blur-sm shadow-sm ${
          (session as any).isSignedUp ? "border-emerald-400/50 bg-emerald-500/5 dark:bg-emerald-500/[0.07]" :
          isFull ? "border-red-400/40 bg-card dark:bg-card/60" :
          isExpanded ? "border-amber-400/40 bg-card dark:bg-card/70" :
          "border-amber-300/40 bg-card dark:bg-card/60 hover:border-amber-400/50"
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20">
                <Flag className="h-3 w-3 mr-0.5" /> TEAM EVENT
              </Badge>
              <Badge className={`text-[10px] ${teTypeInfo.color}`}>
                <TeTypeIcon className="h-3 w-3 mr-0.5" /> {teTypeInfo.label}
              </Badge>
              {teLiveStatus === "live" && (
                <Badge className="bg-green-500 text-white text-[10px] animate-pulse">
                  <Activity className="h-3 w-3 mr-0.5" /> TODAY
                </Badge>
              )}
              {(session as any).isSignedUp && (
                <Badge className="text-[10px] h-5 bg-emerald-500 text-white">Joined</Badge>
              )}
              {isFull && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">FULL</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5" data-testid={`battery-bar-event-${session.id}`}>
                {(() => {
                  const totalBlocks = 10;
                  const filledBlocks = Math.round((fillPercent / 100) * totalBlocks);
                  const barColor = isFull ? "bg-red-500" : fillPercent > 75 ? "bg-amber-500" : "bg-emerald-500";
                  return Array.from({ length: totalBlocks }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[5px] h-[10px] rounded-[1px] ${
                        i < filledBlocks ? barColor : "bg-muted/50 dark:bg-muted/40"
                      }`}
                    />
                  ));
                })()}
              </div>
              <span className={`text-[11px] font-semibold tabular-nums ${isFull ? "text-red-500" : "text-foreground dark:text-white/80"}`}>
                {playerCount}/{session.maxPlayers}
              </span>
            </div>
          </div>

          <h4 className="font-bold text-sm sm:text-base">{session.title}</h4>
          {clubName && (
            <div className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">{clubName}</div>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.startTime}{(session as any).endTime ? ` - ${(session as any).endTime}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor(session.durationMinutes / 60)}h{session.durationMinutes % 60 > 0 ? ` ${session.durationMinutes % 60}m` : ""}
            </span>
            {(session as any).location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{(session as any).location}</span>
              </span>
            )}
            {session.sessionFee != null && session.sessionFee > 0 && (
              <span className="flex items-center gap-1">
                <PoundSterling className="h-3 w-3" />
                £{(session.sessionFee / 100).toFixed(2)}
              </span>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-border/30">
              {(session as any).description && (
                <p className="text-xs text-muted-foreground mb-2">{(session as any).description}</p>
              )}
              {(session as any).meetingPoint && (
                <p className="text-xs text-muted-foreground mb-1">Meeting: {(session as any).meetingPoint}</p>
              )}
              {(session as any).dressCode && (
                <p className="text-xs text-muted-foreground mb-1">Dress Code: {(session as any).dressCode}</p>
              )}
              {(session as any).equipmentRequired && (
                <p className="text-xs text-muted-foreground mb-1">Equipment: {(session as any).equipmentRequired}</p>
              )}
              {(session as any).contactPerson && (
                <p className="text-xs text-muted-foreground mb-1">Contact: {(session as any).contactPerson}{(session as any).contactPhone ? ` (${(session as any).contactPhone})` : ""}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-controls={`session-details-${session.id}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); } }}
      className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none group ${
        isCancelled ? "grayscale-[0.7] opacity-80" : isRealTimePast ? "opacity-55" : ""
      } ${isElite && !isRealTimePast && !isCancelled ? "ring-1 ring-amber-400/30" : ""} ${isRealTimeLive && !isCancelled ? "tl-live-card-glow" : ""} ${isExpanded ? "shadow-lg" : "hover:-translate-y-[3px]"}`}
      onClick={handleCardClick}
      data-testid={`timeline-session-${session.id}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCancelled ? "bg-orange-500" : isRealTimeLive ? "bg-green-500 tl-live-stripe" : accentColor}`} />

      {isCancelled && (
        <div className="flex items-center justify-center gap-3 bg-orange-500 dark:bg-orange-600 text-white px-3 py-2.5 text-lg sm:text-xl font-extrabold uppercase tracking-[0.25em] rounded-t-xl" data-testid={`banner-cancelled-timeline-${session.id}`}>
          <Ban className="h-5 w-5 sm:h-6 sm:w-6" />
          <span>Cancelled</span>
          <Ban className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      )}

      {!isCancelled && (session as any).bannerMessage && (
        <SessionBanner
          message={(session as any).bannerMessage}
          color={(session as any).bannerColor}
          sessionId={session.id}
          variant="card"
        />
      )}

      <div className={`p-4 pl-5 border backdrop-blur-sm shadow-sm ${isCancelled ? "rounded-b-xl border-orange-300 dark:border-orange-700/60 bg-muted/40 dark:bg-muted/20" : (session as any).bannerMessage ? "rounded-b-xl" : "rounded-xl"} ${
        !isCancelled && isSignedUp ? "border-emerald-400/50 bg-emerald-500/5 dark:bg-emerald-500/[0.07]" :
        !isCancelled && isLive ? "border-green-500/50 bg-green-500/5 dark:bg-green-500/[0.07]" :
        !isCancelled && isFull && !isPast ? "border-red-400/40 bg-card dark:bg-card/60" :
        !isCancelled && isExpanded ? "border-primary/40 bg-card dark:bg-card/70" :
        !isCancelled ? "border-border/60 bg-card dark:bg-card/60 hover:border-primary/30" : ""
      }`}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h4 className="font-bold text-sm sm:text-base truncate">{session.title || "Session"}</h4>
            {(isLive || isRealTimeLive) && (
              <span className="tl-live-badge inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white">
                <span className="tl-live-dot w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
            )}
            {isRealTimeLive && !isLive && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/30">NOW</span>
            )}
            {isSignedUp && (
              <>
                <Badge className={`text-[10px] h-5 ${isWaiting ? "bg-amber-500" : "bg-emerald-500"} text-white`}>
                  {isWaiting ? "Waitlist" : "Joined"}
                </Badge>
                {!isWaiting && mySignup?.paymentStatus === "PAID" ? (
                  <Badge className="text-[10px] h-5 bg-blue-600 text-white gap-0.5"><ShieldCheck className="h-3 w-3" />Secured</Badge>
                ) : !isWaiting ? (
                  <Badge variant="outline" className="text-[10px] h-5 border-orange-400 text-orange-600 dark:text-orange-400 gap-0.5"><ShieldX className="h-3 w-3" />Unsecured</Badge>
                ) : null}
                {!isWaiting && (mySignup?.paymentStatus === "PAID" ? (
                  <Badge className="text-[10px] h-5 bg-emerald-600 text-white gap-0.5"><CircleDollarSign className="h-3 w-3" />Paid</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-400 text-amber-600 dark:text-amber-400 gap-0.5"><CircleDollarSign className="h-3 w-3" />Pending</Badge>
                ))}
              </>
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

        <div className="h-px tl-gradient-divider mb-2.5" />

        {hype && !isRealTimePast && (
          <div className={`flex items-center gap-1.5 mb-2 ${hype.color}`} data-testid={`session-hype-${session.id}`}>
            <hype.icon className="h-3 w-3" />
            <span className="text-[10px] font-semibold">{hype.message}</span>
            <div className="flex-1 h-[3px] rounded-full bg-muted/30 overflow-hidden max-w-[50px] ml-auto">
              <div className={`h-full rounded-full tl-energy-micro ${energyScore > 70 ? "bg-orange-500" : energyScore > 40 ? "bg-amber-500" : "bg-blue-500"}`} style={{ "--energy-w": `${energyScore}%` } as React.CSSProperties} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-foreground dark:text-white/80 mb-2.5">
          {venueName && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-foreground/70 dark:text-white/60" />
              <span className="truncate">{venueName}{venue?.city ? `, ${venue.city}` : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-foreground/70 dark:text-white/60" />
            <span className="font-medium text-foreground dark:text-white/90">{session.startTime} → {endTime}</span>
          </div>
          {session.courtsAvailable > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 flex-shrink-0 text-foreground/70 dark:text-white/60" />
              <span>{session.courtsAvailable} Court{session.courtsAvailable !== 1 ? "s" : ""}{session.hallName ? ` · ${session.hallName}` : ""}{session.courtNames && session.courtNames.length > 0 ? ` (${session.courtNames.join(", ")})` : ""}</span>
            </div>
          )}
          {!session.courtsAvailable && (session.hallName || (session.courtNames && session.courtNames.length > 0)) && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-foreground/70 dark:text-white/60" />
              <span>{[session.hallName, session.courtNames?.join(", ")].filter(Boolean).join(" · ")}</span>
            </div>
          )}
          {session.sessionFee != null && (
            <div className="flex items-center gap-1.5">
              <PoundSterling className="h-3.5 w-3.5 flex-shrink-0 text-foreground/70 dark:text-white/60" />
              <span className="font-medium">£{(session.sessionFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 flex-shrink-0 text-foreground/70 dark:text-white/60" />
            <span>{session.durationMinutes >= 60 ? `${Math.floor(session.durationMinutes / 60)}h${session.durationMinutes % 60 > 0 ? ` ${session.durationMinutes % 60}m` : ""}` : `${session.durationMinutes}m`}</span>
          </div>
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
            {session.allowedCategories && session.allowedCategories.length > 0 && (
              (() => {
                const grades = session.allowedCategories.filter((g: string) => !["A", "B", "C", "D"].includes(g));
                const ALL_GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
                const isAll = ALL_GRADES.every(g => session.allowedCategories!.includes(g));
                if (isAll) {
                  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300/50 dark:ring-emerald-700/50">All Grades</span>;
                }
                return grades.map((grade: string) => {
                  const tier = grade.charAt(0);
                  const colors = tier === "A"
                    ? "bg-amber-100 text-amber-800 ring-amber-300/60 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700/50"
                    : tier === "B"
                    ? "bg-blue-100 text-blue-800 ring-blue-300/60 dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-700/50"
                    : "bg-emerald-100 text-emerald-800 ring-emerald-300/60 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700/50";
                  return (
                    <span key={grade} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${colors}`}>
                      {grade}
                    </span>
                  );
                });
              })()
            )}
          </div>

          <div className="flex items-center gap-2">
            {energyScore > 70 && !isRealTimePast && !isCancelled && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                style={{ background: "hsl(var(--accent) / 0.14)", color: "hsl(var(--accent))", boxShadow: "inset 0 0 0 1px hsl(var(--accent) / 0.35)" }}
                data-testid={`badge-high-energy-${session.id}`}
                title="High-energy session"
              >
                <Flame className="h-3 w-3 animate-elite-pulse" />
                Hot
              </span>
            )}
            <div className="flex items-center gap-0.5" data-testid={`battery-bar-${session.id}`}>
              {(() => {
                const totalBlocks = 10;
                const filledBlocks = Math.round((fillPercent / 100) * totalBlocks);
                return Array.from({ length: totalBlocks }).map((_, i) => {
                  const isOn = i < filledBlocks;
                  const isLastOn = isOn && i === filledBlocks - 1;
                  const isLastFull = isFull && isLastOn;
                  const fillStyle: React.CSSProperties = isOn
                    ? isFull
                      ? {
                          background: "hsl(var(--destructive))",
                          boxShadow: isLastOn ? "0 0 6px hsl(var(--destructive) / 0.55)" : undefined,
                        }
                      : {
                          background: "hsl(var(--accent))",
                          boxShadow: isLastOn ? "0 0 5px hsl(var(--accent) / 0.45)" : undefined,
                        }
                    : { background: "hsl(var(--muted) / 0.6)" };
                  return (
                    <div
                      key={i}
                      className={`w-[5px] h-[10px] rounded-[1px] ${isOn ? `tl-cap-block ${isLastFull ? "tl-cap-pulse-only" : ""}` : ""}`}
                      style={{ ...fillStyle, animationDelay: isOn ? `${i * 60}ms` : undefined }}
                    />
                  );
                });
              })()}
            </div>
            <span
              className="text-[11px] font-semibold tabular-nums text-foreground"
              style={isFull ? { color: "hsl(var(--destructive))" } : undefined}
            >
              {playerCount}/{session.maxPlayers}
            </span>
          </div>
        </div>

        {clubName && (
          <div className="mt-2 text-sm font-semibold text-foreground/85">{clubName}</div>
        )}

        {(() => {
          const s: any = session;
          const coords = Array.isArray(s.coordinatorUsers) && s.coordinatorUsers.length > 0 ? s.coordinatorUsers : (s.coordinatorUser ? [s.coordinatorUser] : []);
          const orgs = Array.isArray(s.organiserUsers) && s.organiserUsers.length > 0 ? s.organiserUsers : (s.organiserUser ? [s.organiserUser] : []);
          const coaches = Array.isArray(s.coachUsers) && s.coachUsers.length > 0 ? s.coachUsers : (s.coachUser ? [s.coachUser] : []);
          const supports = Array.isArray(s.supportCoachUsers) ? s.supportCoachUsers : [];
          const total = coords.length + orgs.length + coaches.length + supports.length;
          if (total === 0) return null;
          return (
            <div className="mt-2" data-testid={`timeline-team-row-${session.id}`}>
              <SessionTeamBadges
                coordinators={coords}
                organisers={orgs}
                coaches={coaches}
                supportCoaches={supports}
                sessionId={session.id}
              />
            </div>
          );
        })()}

        {(session as any).waitingCount > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2" data-testid={`timeline-waiting-list-${session.id}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300/50 dark:ring-amber-700/50">
                Waiting List
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[5px] h-[10px] rounded-[1px] ${
                      i < Math.round(Math.min((session as any).waitingCount / session.maxPlayers * 100, 100) / 10) ? "bg-amber-500" : "bg-muted/50 dark:bg-muted/40"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {(session as any).waitingCount}
              </span>
            </div>
          </div>
        )}

        {isExpanded && <ExpandedSessionDetails session={session} clubs={clubs} mySignup={mySignup} onSignUp={onSignUp} onWithdraw={onWithdraw} onNavigate={onNavigate} adminActions={adminActions} />}
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
        {adminActions.onRemindMembers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg h-8 px-2 text-xs text-muted-foreground gap-1"
                onClick={(e) => { e.stopPropagation(); adminActions.onRemindMembers!(session.id); }}
                data-testid={`button-remind-view-${session.id}`}
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Remind</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remind Members</TooltipContent>
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
        {adminActions.onEndSession && session.status !== "COMPLETED" && session.status !== "CANCELLED" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg h-8 px-2 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`End "${session.title || "this session"}" now? This will mark it as completed, stop auto-generating matches, and lock results.`)) {
                    adminActions.onEndSession!(session);
                  }
                }}
                data-testid={`button-end-view-${session.id}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">End</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>End Session</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 px-2 text-xs gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${session.title || "this session"}"? This will permanently remove the session, its signups, matches, and finances. This cannot be undone.`)) {
                  adminActions.onDelete(session);
                }
              }}
              data-testid={`button-delete-view-bar-${session.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Session</TooltipContent>
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
              onClick={(e) => { e.stopPropagation(); adminActions.onDetails(session); }}
              data-testid={`button-rsvp-dropdown-${session.id}`}
            >
              <Users className="h-4 w-4 mr-2" />
              RSVP List
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); adminActions.onEdit(session); }}
              data-testid={`button-edit-dropdown-${session.id}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Session
            </DropdownMenuItem>
            {adminActions.onRemindMembers && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); adminActions.onRemindMembers!(session.id); }}
                data-testid={`button-remind-dropdown-${session.id}`}
              >
                <Bell className="h-4 w-4 mr-2" />
                Remind Members
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
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
            {(adminActions.onCancel || adminActions.onReactivate) && (
              <>
                <DropdownMenuSeparator />
                {session.status === "CANCELLED" ? (
                  adminActions.onReactivate && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); adminActions.onReactivate!(session); }}
                      data-testid={`button-reactivate-view-${session.id}`}
                    >
                      <RefreshCw className="h-4 w-4 mr-2 text-emerald-500" />
                      Reactivate Session
                    </DropdownMenuItem>
                  )
                ) : (
                  adminActions.onCancel && (
                    <DropdownMenuItem
                      className="text-amber-600 dark:text-amber-400 focus:text-amber-600 dark:focus:text-amber-400"
                      onClick={(e) => { e.stopPropagation(); adminActions.onCancel!(session); }}
                      data-testid={`button-cancel-view-${session.id}`}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Session
                    </DropdownMenuItem>
                  )
                )}
              </>
            )}
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
  const isAdmin = !!adminActions?.editableClubIds.has(session.clubId);

  const { data: previewSignups } = useQuery<any[]>({
    queryKey: ["/api/sessions", session.id, "signups"],
    queryFn: async () => {
      const r = await fetch(`/api/sessions/${session.id}/signups`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load signups");
      return r.json();
    },
    enabled: open,
    staleTime: 30000,
  });
  const confirmed = (previewSignups || []).filter((s: any) => s.signupStatus === "CONFIRMED" || !s.signupStatus);
  const waiting = (previewSignups || []).filter((s: any) => s.signupStatus === "WAITING");

  const { data: clubLeaderboard } = useQuery<any[]>({
    queryKey: ["/api/leaderboard", { clubId: session.clubId }],
    queryFn: async () => {
      const r = await fetch(`/api/leaderboard?clubId=${session.clubId}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: open,
    staleTime: 60000,
  });
  const rankByProfileId = useMemo(() => {
    const map = new Map<number, number>();
    if (!clubLeaderboard?.length) return map;
    const sorted = [...clubLeaderboard].sort((a: any, b: any) =>
      (b.matchesWon || 0) - (a.matchesWon || 0) ||
      (b.winPercentage || 0) - (a.winPercentage || 0) ||
      (b.matchesPlayed || 0) - (a.matchesPlayed || 0)
    );
    let currentRank = 0;
    let lastWins = -1;
    let lastPct = -1;
    sorted.forEach((p: any, idx: number) => {
      const tied = (p.matchesWon || 0) === lastWins && (p.winPercentage || 0) === lastPct;
      if (!tied) currentRank = idx + 1;
      lastWins = p.matchesWon || 0;
      lastPct = p.winPercentage || 0;
      if (p.id != null) map.set(p.id, currentRank);
    });
    return map;
  }, [clubLeaderboard]);

  const gradeChipClass = (grade?: string | null) => {
    if (!grade) return "bg-muted text-muted-foreground";
    const tier = grade.charAt(0);
    if (tier === "A") return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
    if (tier === "B") return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
  };
  const renderRsvpRow = (s: any, idx: number) => {
    const player = s.player || {};
    const user = player.user || {};
    const fullName = user.fullName || "Player";
    const grade = player.grade || null;
    const rank = player.id != null ? rankByProfileId.get(player.id) : undefined;
    const initials = fullName.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
    const paid = s.paymentStatus === "PAID";
    return (
      <div
        key={s.id ?? idx}
        className="flex items-center gap-2 py-1.5"
        data-testid={`rsvp-row-${session.id}-${s.id ?? idx}`}
      >
        <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate" data-testid={`rsvp-name-${s.id ?? idx}`}>{fullName}</span>
          {grade && (
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${gradeChipClass(grade)}`} data-testid={`rsvp-grade-${s.id ?? idx}`}>
              {grade}
            </span>
          )}
          {rank ? (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" data-testid={`rsvp-rank-${s.id ?? idx}`}>
              #{rank}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" data-testid={`rsvp-rank-unranked-${s.id ?? idx}`}>
              Unranked
            </span>
          )}
        </div>
        {isAdmin && (
          paid ? (
            <CircleDollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" data-testid={`rsvp-paid-${s.id ?? idx}`} />
          ) : (
            <CircleDollarSign className="h-3.5 w-3.5 text-amber-500 shrink-0" data-testid={`rsvp-unpaid-${s.id ?? idx}`} />
          )
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-session-preview">
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
            {(session.sessionFee != null || session.premiumFee != null || session.superPremiumFee != null || session.clubMemberFee != null) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 col-span-2">
                <PoundSterling className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Fees</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                    {session.sessionFee != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Standard</span><span className="font-medium">£{(session.sessionFee / 100).toFixed(2)}</span></div>
                    )}
                    {session.premiumFee != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Premium</span><span className="font-medium text-violet-600 dark:text-violet-400">£{(session.premiumFee / 100).toFixed(2)}</span></div>
                    )}
                    {session.superPremiumFee != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Super Premium</span><span className="font-medium text-amber-600 dark:text-amber-400">£{(session.superPremiumFee / 100).toFixed(2)}</span></div>
                    )}
                    {session.clubMemberFee != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Club Member</span><span className="font-medium text-blue-600 dark:text-blue-400">£{(session.clubMemberFee / 100).toFixed(2)}</span></div>
                    )}
                  </div>
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
                <Layers className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">{clubName}</span>
              </div>
            )}
            {session.courtsAvailable > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Swords className="h-4 w-4 text-muted-foreground" />
                <span>{session.courtsAvailable} court{session.courtsAvailable !== 1 ? "s" : ""}{session.hallName ? ` · ${session.hallName}` : ""}{session.courtNames && session.courtNames.length > 0 ? ` (${session.courtNames.join(", ")})` : ""}</span>
              </div>
            )}
            {!session.courtsAvailable && (session.hallName || (session.courtNames && session.courtNames.length > 0)) && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{[session.hallName, session.courtNames?.join(", ")].filter(Boolean).join(" · ")}</span>
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
            {session.allowedCategories && session.allowedCategories.length > 0 && (
              (() => {
                const ALL_GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
                const isAll = ALL_GRADES.every(g => session.allowedCategories!.includes(g));
                if (isAll) {
                  return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50">All Grades</span>;
                }
                return session.allowedCategories.filter((g: string) => !["A", "B", "C", "D"].includes(g)).map((grade: string) => {
                  const tier = grade.charAt(0);
                  const colors = tier === "A"
                    ? "bg-amber-100 text-amber-800 border-amber-300/60 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700/50"
                    : tier === "B"
                    ? "bg-blue-100 text-blue-800 border-blue-300/60 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300/60 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/50";
                  return (
                    <span key={grade} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold border ${colors}`}>
                      {grade}
                    </span>
                  );
                });
              })()
            )}
            {isLive && <Badge className="bg-green-600 text-white">LIVE</Badge>}
          </div>

          <div className="rounded-xl border bg-muted/30 p-3 space-y-2" data-testid={`rsvp-list-${session.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">RSVP'd Players</span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid={`rsvp-count-${session.id}`}>
                {confirmed.length}{session.maxPlayers ? ` / ${session.maxPlayers}` : ""}
              </span>
            </div>
            {confirmed.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No one has signed up yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto pr-1 divide-y divide-border/40">
                {confirmed.map(renderRsvpRow)}
              </div>
            )}
            {waiting.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Waiting list ({waiting.length})</p>
                <div className="max-h-32 overflow-y-auto pr-1 divide-y divide-border/40">
                  {waiting.map(renderRsvpRow)}
                </div>
              </div>
            )}
          </div>

          {isSignedUp ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {isWaiting ? "You're on the waiting list" : "You're signed up for this session"}
                </span>
              </div>
              {!isWaiting && (
                <div className="flex items-center gap-2 flex-wrap">
                  {mySignup?.paymentStatus === "PAID" ? (
                    <div className="flex-1 flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 px-3.5 py-2.5">
                      <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Space Secured</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-800/40 px-3.5 py-2.5">
                      <ShieldX className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Space Unsecured</span>
                    </div>
                  )}
                  {mySignup?.paymentStatus === "PAID" ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 px-3.5 py-2.5">
                      <CircleDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Payment Received</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 px-3.5 py-2.5">
                      <CircleDollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Payment Pending</span>
                    </div>
                  )}
                </div>
              )}
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
                  <span className={`text-xs sm:text-sm ${isToday ? "font-bold text-black" : ""}`}>
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

export function TimelineView({ sessions, clubs, onSessionClick, mySignupsBySession, onSignUp, onWithdraw, adminActions }: TimelineViewProps) {
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
        @keyframes tl-liveCardGlow {
          0%, 100% { box-shadow: 0 0 8px 0px rgba(34, 197, 94, 0.15); }
          50% { box-shadow: 0 0 20px 4px rgba(34, 197, 94, 0.25); }
        }
        .tl-live-card-glow {
          animation: tl-liveCardGlow 3s ease-in-out infinite;
        }
        @keyframes tl-liveStripe {
          0% { background-position: 0 0; }
          100% { background-position: 0 20px; }
        }
        .tl-live-stripe {
          background: repeating-linear-gradient(
            0deg,
            rgba(34,197,94,1) 0px,
            rgba(34,197,94,1) 6px,
            rgba(34,197,94,0.5) 6px,
            rgba(34,197,94,0.5) 10px
          );
          background-size: 100% 20px;
          animation: tl-liveStripe 1s linear infinite;
        }
        .tl-gradient-divider {
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent);
        }
        @keyframes tl-capBlockIn {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        .tl-cap-block {
          animation: tl-capBlockIn 0.4s ease-out both;
          transform-origin: bottom;
        }
        @keyframes tl-capPulse {
          0%, 100% { box-shadow: 0 0 3px 0px currentColor; }
          50% { box-shadow: 0 0 8px 2px currentColor; }
        }
        .tl-cap-pulse-only {
          animation: tl-capBlockIn 0.4s ease-out both, tl-capPulse 1.5s ease-in-out 0.4s infinite;
        }
        @keyframes tl-energyMicro {
          from { width: 0%; }
          to { width: var(--energy-w); }
        }
        .tl-energy-micro {
          animation: tl-energyMicro 0.8s ease-out 0.3s both;
        }
        @keyframes tl-energyBarGrow {
          from { width: 0%; }
          to { width: var(--energy-width); }
        }
        .tl-energy-bar {
          width: var(--energy-width);
          animation: tl-energyBarGrow 1s ease-out both;
        }
        .tl-energy-track {
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }
        /* Theme-token surfaces — adapt automatically to any theme (light, dark, Elite Sports default, premium themes) */
        .tl-dropdown-panel {
          background: hsl(var(--card) / 0.72);
          backdrop-filter: blur(14px) saturate(1.4);
          -webkit-backdrop-filter: blur(14px) saturate(1.4);
          border: 1px solid hsl(var(--border) / 0.7);
          box-shadow: 0 4px 24px hsl(0 0% 0% / 0.18), 0 1px 4px hsl(0 0% 0% / 0.12);
        }
        .tl-insight-card {
          background: hsl(var(--muted) / 0.55);
          border: 1px solid hsl(var(--accent) / 0.25);
        }
        .tl-section-card {
          background: hsl(var(--muted) / 0.45);
          border: 1px solid hsl(var(--border) / 0.6);
        }
        .tl-stat-card {
          background: hsl(var(--muted) / 0.6);
          border: 1px solid hsl(var(--border) / 0.4);
        }
        @keyframes tl-sectionIconGlow {
          0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
          50% { filter: drop-shadow(0 0 6px currentColor); }
        }
        .tl-section-icon {
          animation: tl-sectionIconGlow 3s ease-in-out infinite;
        }
        @keyframes tl-crownBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(-3deg); }
          75% { transform: translateY(-1px) rotate(3deg); }
        }
        .tl-crown-icon {
          animation: tl-crownBob 3s ease-in-out infinite;
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.4));
        }
        .tl-crown-card {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.04));
          border: 1px solid rgba(251, 191, 36, 0.2);
        }
        .dark .tl-crown-card {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05));
          border: 1px solid rgba(251, 191, 36, 0.25);
        }
        .tl-challenge-banner {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.06), rgba(217, 119, 6, 0.04));
          border: 1px solid rgba(251, 191, 36, 0.15);
        }
        .dark .tl-challenge-banner {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(217, 119, 6, 0.05));
          border: 1px solid rgba(251, 191, 36, 0.2);
        }
        .tl-now-marker {
          position: relative;
        }
        .tl-now-marker::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%);
          animation: tl-nodeGlow 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tl-card-anim,
          .tl-date-anim,
          .tl-time-anim,
          .tl-node-glow,
          .tl-node-ring,
          .tl-rail-anim,
          .tl-connector-anim,
          .tl-live-card-glow,
          .tl-live-stripe,
          .tl-cap-block,
          .tl-cap-pulse-only,
          .tl-energy-micro,
          .tl-section-icon { animation: none; }
          .tl-bar-fill { animation: none; transform: scaleX(1); }
          .tl-live-dot::before { animation: none; }
          .tl-live-badge { animation: none; }
          .tl-cap-block { transform: scaleY(1); opacity: 1; }
          .tl-energy-micro { width: var(--energy-w); }
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
                    isPast ? "bg-muted/50" :
                    "bg-card border border-border/50"
                  }`} style={{ animationDelay: `${gi * 80}ms` }}>
                    <span className={`text-[22px] sm:text-[28px] font-black leading-none tabular-nums ${
                      isToday ? "text-primary" :
                      isTomorrow ? "text-blue-500" :
                      isPast ? "text-muted-foreground dark:text-muted-foreground/70" :
                      "text-foreground dark:text-white"
                    }`}>{day}</span>
                    <span className={`text-[10px] font-bold tracking-widest mt-0.5 ${
                      isToday ? "text-primary" :
                      isTomorrow ? "text-blue-500" :
                      isPast ? "text-muted-foreground/80 dark:text-muted-foreground/60" :
                      "text-foreground/70 dark:text-white/70"
                    }`}>{month}</span>
                    <span className="text-[9px] text-muted-foreground/70 dark:text-muted-foreground/60 font-medium">{year}</span>
                  </div>

                  {sortedSessions.map((s, si) => {
                    const durLabel = s.durationMinutes >= 60
                      ? `${Math.floor(s.durationMinutes / 60)}h${s.durationMinutes % 60 > 0 ? `${s.durationMinutes % 60}m` : ""}`
                      : `${s.durationMinutes}m`;
                    return (
                      <div key={s.id} className={`tl-time-anim flex flex-col items-center w-full ${si === 0 ? "mt-6" : "mt-[26px]"}`} style={{ animationDelay: `${gi * 80 + (si + 1) * 100}ms` }}>
                        <span className={`text-sm sm:text-[15px] font-bold tabular-nums leading-tight ${
                          isPast ? "text-muted-foreground/80 dark:text-muted-foreground/60" : "text-foreground dark:text-white"
                        }`}>{s.startTime}</span>
                        <span className={`text-[10px] sm:text-[11px] font-medium tabular-nums leading-tight mt-0.5 px-1.5 py-0.5 rounded-md ${
                          isPast ? "text-muted-foreground/70 dark:text-muted-foreground/50" : "text-foreground/60 dark:text-white/70 bg-muted/50 dark:bg-muted/50"
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
                      isPast ? "text-foreground/60 dark:text-white/60" :
                      "text-foreground dark:text-white"
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
                              onSignUp={onSignUp}
                              onWithdraw={onWithdraw}
                              adminActions={adminActions}
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
                    const isCancelled = s.status === "CANCELLED";

                    return (
                      <div
                        key={s.id}
                        className={`rounded-lg border cursor-pointer transition-all hover:shadow-sm overflow-hidden ${
                          isCancelled ? "border-orange-300 dark:border-orange-700/60 bg-muted/40 dark:bg-muted/20 grayscale-[0.7] opacity-80" :
                          isLive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
                          isPast ? "border-border/30 opacity-60" :
                          "border-border/50 hover:border-primary/30"
                        }`}
                        onClick={() => onSessionClick(s)}
                        data-testid={`grouped-session-${s.id}`}
                      >
                      {isCancelled && (
                        <div className="flex items-center justify-center gap-2 bg-orange-500 dark:bg-orange-600 text-white px-3 py-2 text-base sm:text-lg font-extrabold uppercase tracking-[0.25em]" data-testid={`banner-cancelled-grouped-${s.id}`}>
                          <Ban className="h-5 w-5" />
                          <span>Cancelled</span>
                          <Ban className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex items-center justify-between p-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                          <div className="min-w-0">
                            <span className={`font-medium text-sm ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
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
