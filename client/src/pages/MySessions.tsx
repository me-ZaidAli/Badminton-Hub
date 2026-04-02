import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, CalendarDays, Clock, Trophy, Target, TrendingUp,
  ChevronDown, ChevronUp, Search, PoundSterling, CheckCircle2,
  AlertCircle, XCircle, LogOut, Medal, Swords, Filter, X
} from "lucide-react";
import { Link } from "wouter";

interface MatchDetail {
  matchId: number;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  setsWonA: number;
  setsWonB: number;
  playerWon: boolean;
  playerTeam: "A" | "B";
}

interface SessionHistory {
  sessionId: number;
  sessionTitle: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionStatus: string;
  sessionDuration?: number;
  clubId: number;
  clubName: string;
  fee: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
  matchesWon: number;
  matchesLost: number;
  matchesTotal: number;
  matchDetails: MatchDetail[];
  allowedCategories?: string[];
  matchMode?: string;
}

interface MySession {
  signupId: number;
  sessionId: number;
  playerId: number;
  signupStatus: string;
  fee: number | null;
  paymentStatus: string | null;
  sessionTitle: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionDuration: number;
  sessionStatus: string;
  maxPlayers: number;
  courtsAvailable: number;
  clubId: number;
  clubName: string;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  allowedCategories?: string[];
  matchMode?: string;
}

interface PerformanceData {
  clubs: {
    clubId: number;
    clubName: string;
    rank: number;
    totalPlayers: number;
    played: number;
    won: number;
    lost: number;
    winPct: number;
    grade: string | null;
  }[];
  totals: { played: number; won: number; lost: number; winPct: number };
}

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function PaymentBadge({ status }: { status: string | null }) {
  if (!status || status === "UNPAID") {
    return <Badge variant="destructive" className="text-[10px] no-default-hover-elevate gap-1"><XCircle className="h-3 w-3" />Unpaid</Badge>;
  }
  if (status === "CONFIRMED" || status === "PAID") {
    return <Badge className="bg-emerald-600 text-white text-[10px] no-default-hover-elevate gap-1"><CheckCircle2 className="h-3 w-3" />Paid</Badge>;
  }
  if (status === "PENDING" || status === "PLAYER_CONFIRMED") {
    return <Badge variant="secondary" className="text-[10px] no-default-hover-elevate gap-1"><AlertCircle className="h-3 w-3" />Pending</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] no-default-hover-elevate">{status}</Badge>;
}

function WinRateBadge({ winRate }: { winRate: number }) {
  const color = winRate >= 60 ? "text-emerald-500" : winRate >= 40 ? "text-amber-500" : "text-red-400";
  return <span className={`font-bold text-sm ${color}`}>{winRate.toFixed(0)}%</span>;
}

function HistorySessionCard({ session }: { session: SessionHistory }) {
  const [open, setOpen] = useState(false);
  const winRate = session.matchesTotal > 0 ? (session.matchesWon / session.matchesTotal) * 100 : 0;
  const sessionDate = new Date(session.sessionDate);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card overflow-hidden" data-testid={`history-card-${session.sessionId}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-3 sm:p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/sessions/${session.sessionId}`} className="font-semibold text-sm hover:underline truncate" onClick={(e) => e.stopPropagation()} data-testid={`link-history-session-${session.sessionId}`}>
                    {session.sessionTitle}
                  </Link>
                  <Badge variant="outline" className="text-[10px] no-default-hover-elevate">{session.clubName}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(sessionDate, "EEE, dd MMM yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {session.sessionStartTime}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {session.matchesTotal > 0 ? (
                    <>
                      <span className="flex items-center gap-1 text-xs">
                        <Trophy className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-600 font-medium">{session.matchesWon}W</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <XCircle className="h-3 w-3 text-red-400" />
                        <span className="text-red-400 font-medium">{session.matchesLost}L</span>
                      </span>
                      <WinRateBadge winRate={winRate} />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No matches recorded</span>
                  )}
                  {session.fee > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <PoundSterling className="h-3 w-3" />
                      {formatPounds(session.fee)}
                    </span>
                  )}
                  <PaymentBadge status={session.paymentStatus} />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {session.matchesTotal > 0 && (
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <Swords className="h-3.5 w-3.5" />
                    {session.matchDetails.length}
                  </div>
                )}
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {session.matchDetails.length > 0 ? (
            <div className="border-t px-3 sm:px-4 py-3 space-y-2 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Match Details</p>
              {session.matchDetails.map((match, i) => (
                <div key={match.matchId} className={`rounded-md border p-2.5 text-xs ${match.playerWon ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-400/30 bg-red-400/5"}`} data-testid={`match-detail-${match.matchId}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{match.teamA.join(" & ")}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">{match.teamB.join(" & ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold tabular-nums">
                        {match.scoreA ?? match.setsWonA} - {match.scoreB ?? match.setsWonB}
                      </span>
                      {match.playerWon ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] no-default-hover-elevate">Won</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] no-default-hover-elevate">Lost</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t px-4 py-4 text-center text-sm text-muted-foreground">
              No match details available for this session
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function UpcomingSessionCard({ session, onWithdraw, withdrawing }: {
  session: MySession;
  onWithdraw: (id: number) => void;
  withdrawing: boolean;
}) {
  const sessionDate = new Date(session.sessionDate);

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-2" data-testid={`upcoming-card-${session.sessionId}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/sessions/${session.sessionId}`} className="font-semibold text-sm hover:underline truncate" data-testid={`link-upcoming-${session.sessionId}`}>
              {session.sessionTitle}
            </Link>
            <Badge variant={session.sessionStatus === "ACTIVE" ? "default" : "secondary"} className={`text-[10px] no-default-hover-elevate ${session.sessionStatus === "ACTIVE" ? "bg-green-500" : ""}`}>
              {session.sessionStatus === "ACTIVE" ? "Live" : "Upcoming"}
            </Badge>
            <Badge variant={session.signupStatus === "CONFIRMED" ? "default" : "outline"} className={`text-[10px] no-default-hover-elevate ${session.signupStatus === "CONFIRMED" ? "bg-emerald-600 text-white" : ""}`}>
              {session.signupStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(sessionDate, "EEE, dd MMM yyyy")}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{session.sessionStartTime} ({session.sessionDuration}min)</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <Badge variant="outline" className="text-[10px] no-default-hover-elevate">{session.clubName}</Badge>
            {session.venueName && <span>{session.venueName}</span>}
            {session.fee != null && session.fee > 0 && (
              <span className="flex items-center gap-1"><PoundSterling className="h-3 w-3" />{formatPounds(session.fee)}</span>
            )}
            <PaymentBadge status={session.paymentStatus} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onWithdraw(session.sessionId)} disabled={withdrawing} data-testid={`button-withdraw-${session.sessionId}`} className="shrink-0 text-xs">
          <LogOut className="h-3 w-3 mr-1" />
          Withdraw
        </Button>
      </div>
    </div>
  );
}

function InvitedSessionCard({ session, onWithdraw, withdrawing }: {
  session: MySession;
  onWithdraw: (id: number) => void;
  withdrawing: boolean;
}) {
  const sessionDate = new Date(session.sessionDate);

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 sm:p-4 space-y-2" data-testid={`invited-card-${session.sessionId}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/sessions/${session.sessionId}`} className="font-semibold text-sm hover:underline truncate" data-testid={`link-invited-${session.sessionId}`}>
              {session.sessionTitle}
            </Link>
            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate">
              {session.sessionStatus === "ACTIVE" ? "Live" : "Upcoming"}
            </Badge>
            <Badge className="text-[10px] no-default-hover-elevate bg-blue-500 text-white">
              Invited
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(sessionDate, "EEE, dd MMM yyyy")}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{session.sessionStartTime} ({session.sessionDuration}min)</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <Badge variant="outline" className="text-[10px] no-default-hover-elevate">{session.clubName}</Badge>
            {session.venueName && <span>{session.venueName}</span>}
            {session.fee != null && session.fee > 0 && (
              <span className="flex items-center gap-1"><PoundSterling className="h-3 w-3" />{formatPounds(session.fee)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Link href={`/sessions/${session.sessionId}`}>
            <Button variant="default" size="sm" className="text-xs w-full" data-testid={`button-view-invite-${session.sessionId}`}>
              View
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onWithdraw(session.sessionId)} disabled={withdrawing} data-testid={`button-decline-${session.sessionId}`} className="text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MySessions() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"upcoming" | "invited" | "history">("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const { data: upcomingSessions = [], isLoading: upcomingLoading } = useQuery<MySession[]>({
    queryKey: ["/api/my-sessions"],
    enabled: !!user,
  });

  const { data: historyRaw = [], isLoading: historyLoading } = useQuery<SessionHistory[]>({
    queryKey: ["/api/my-session-history"],
    enabled: !!user,
  });

  const { data: performance } = useQuery<PerformanceData>({
    queryKey: ["/api/my-match-performance"],
    enabled: !!user,
  });

  const history = useMemo(() => {
    return historyRaw.filter(s => s.sessionStatus === "COMPLETED");
  }, [historyRaw]);

  const confirmedUpcoming = useMemo(() => {
    return upcomingSessions.filter(s => s.signupStatus !== "INVITED");
  }, [upcomingSessions]);

  const invitedSessions = useMemo(() => {
    return upcomingSessions.filter(s => s.signupStatus === "INVITED");
  }, [upcomingSessions]);

  const allClubs = useMemo(() => {
    const map = new Map<number, string>();
    upcomingSessions.forEach(s => map.set(s.clubId, s.clubName));
    history.forEach(s => map.set(s.clubId, s.clubName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [upcomingSessions, history]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    const source = activeTab === "upcoming" ? upcomingSessions : history;
    source.forEach(s => {
      const ac = (s as any).allowedCategories;
      if (Array.isArray(ac)) ac.forEach((c: string) => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [upcomingSessions, history, activeTab]);

  const filteredUpcoming = useMemo(() => {
    let items = confirmedUpcoming;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(s => s.sessionTitle.toLowerCase().includes(q) || s.clubName.toLowerCase().includes(q));
    }
    if (clubFilter !== "all") items = items.filter(s => s.clubId === parseInt(clubFilter));
    if (paymentFilter !== "all") {
      items = items.filter(s => {
        if (paymentFilter === "paid") return s.paymentStatus === "CONFIRMED" || s.paymentStatus === "PAID";
        if (paymentFilter === "pending") return s.paymentStatus === "PENDING" || s.paymentStatus === "PLAYER_CONFIRMED";
        if (paymentFilter === "unpaid") return !s.paymentStatus || s.paymentStatus === "UNPAID";
        return true;
      });
    }
    if (categoryFilter !== "all") {
      items = items.filter(s => {
        const ac = (s as any).allowedCategories;
        return Array.isArray(ac) && ac.includes(categoryFilter);
      });
    }
    return items;
  }, [confirmedUpcoming, searchTerm, clubFilter, paymentFilter, categoryFilter]);

  const filteredInvited = useMemo(() => {
    let items = invitedSessions;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(s => s.sessionTitle.toLowerCase().includes(q) || s.clubName.toLowerCase().includes(q));
    }
    if (clubFilter !== "all") items = items.filter(s => s.clubId === parseInt(clubFilter));
    if (categoryFilter !== "all") {
      items = items.filter(s => {
        const ac = (s as any).allowedCategories;
        return Array.isArray(ac) && ac.includes(categoryFilter);
      });
    }
    return items;
  }, [invitedSessions, searchTerm, clubFilter, categoryFilter]);

  const filteredHistory = useMemo(() => {
    let items = history;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(s => s.sessionTitle.toLowerCase().includes(q) || s.clubName.toLowerCase().includes(q));
    }
    if (clubFilter !== "all") items = items.filter(s => s.clubId === parseInt(clubFilter));
    if (paymentFilter !== "all") {
      items = items.filter(s => {
        if (paymentFilter === "paid") return s.paymentStatus === "CONFIRMED" || s.paymentStatus === "PAID";
        if (paymentFilter === "pending") return s.paymentStatus === "PENDING" || s.paymentStatus === "PLAYER_CONFIRMED";
        if (paymentFilter === "unpaid") return !s.paymentStatus || s.paymentStatus === "UNPAID";
        return true;
      });
    }
    if (categoryFilter !== "all") {
      items = items.filter(s => {
        const ac = (s as any).allowedCategories;
        return Array.isArray(ac) && ac.includes(categoryFilter);
      });
    }
    if (dateFrom) {
      const from = parseISO(dateFrom);
      items = items.filter(s => !isBefore(new Date(s.sessionDate), from));
    }
    if (dateTo) {
      const to = parseISO(dateTo);
      items = items.filter(s => !isAfter(new Date(s.sessionDate), to));
    }
    return items;
  }, [history, searchTerm, clubFilter, paymentFilter, categoryFilter, dateFrom, dateTo]);

  const historyStats = useMemo(() => {
    const totalWon = filteredHistory.reduce((s, h) => s + h.matchesWon, 0);
    const totalLost = filteredHistory.reduce((s, h) => s + h.matchesLost, 0);
    const totalGames = totalWon + totalLost;
    return { totalWon, totalLost, totalGames, winRate: totalGames > 0 ? (totalWon / totalGames) * 100 : 0 };
  }, [filteredHistory]);

  const withdrawMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("POST", `/api/sessions/${sessionId}/withdraw`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-session-history"] });
    },
  });

  const handleWithdraw = async (sessionId: number) => {
    setWithdrawingId(sessionId);
    try {
      await withdrawMutation.mutateAsync(sessionId);
      toast({ title: "Withdrawn", description: "You have been removed from this session." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to withdraw", variant: "destructive" });
    } finally {
      setWithdrawingId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setClubFilter("all");
    setPaymentFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchTerm || clubFilter !== "all" || paymentFilter !== "all" || categoryFilter !== "all" || dateFrom || dateTo;

  if (userLoading || (upcomingLoading && historyLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-page" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card><CardContent className="py-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Please log in to view your sessions.</p>
        </CardContent></Card>
      </div>
    );
  }

  const bestRank = performance?.clubs?.reduce((best, c) => {
    if (c.rank > 0 && c.totalPlayers > 0 && (!best || c.rank < best.rank)) return c;
    return best;
  }, null as any);

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <CalendarDays className="h-6 w-6 text-primary" />
          My Sessions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Your upcoming sessions and match history</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" data-testid="summary-banner">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl sm:text-2xl font-bold" data-testid="stat-sessions-played">{history.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-xl sm:text-2xl font-bold text-emerald-600" data-testid="stat-wins">{performance?.totals?.won || 0}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Wins</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xl sm:text-2xl font-bold" data-testid="stat-win-rate">
              {performance?.totals?.winPct != null ? `${Math.round(performance.totals.winPct)}%` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
          <CardContent className="p-3 text-center">
            <Medal className="h-5 w-5 mx-auto mb-1 text-violet-500" />
            <p className="text-xl sm:text-2xl font-bold" data-testid="stat-ranking">
              {bestRank ? `#${bestRank.rank}` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {bestRank ? `of ${bestRank.totalPlayers}` : "Ranking"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-1 border-b" data-testid="tabs">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "upcoming" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-upcoming"
        >
          Upcoming ({confirmedUpcoming.length})
        </button>
        <button
          onClick={() => setActiveTab("invited")}
          className={`relative px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "invited" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-invited"
        >
          Invited ({invitedSessions.length})
          {invitedSessions.length > 0 && activeTab !== "invited" && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-history"
        >
          History ({history.length})
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-search"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0 h-9"
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-primary" />}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 h-9 text-xs" data-testid="button-clear-filters">
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap p-3 rounded-md border bg-muted/30" data-testid="filter-panel">
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-club-filter">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {allClubs.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-payment-filter">
                <SelectValue placeholder="All Payments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            {allCategories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(c => (
                    <SelectItem key={c} value={c}>Category {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTab === "history" && (
              <>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px] h-8 text-xs" placeholder="From" data-testid="input-date-from" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px] h-8 text-xs" placeholder="To" data-testid="input-date-to" />
              </>
            )}
          </div>
        )}
      </div>

      {activeTab === "upcoming" && (
        <div className="space-y-2" data-testid="upcoming-list">
          {upcomingLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredUpcoming.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-upcoming">{hasActiveFilters ? "No sessions match your filters" : "No upcoming sessions"}</p>
            </CardContent></Card>
          ) : (
            filteredUpcoming.map(s => (
              <UpcomingSessionCard
                key={s.signupId}
                session={s}
                onWithdraw={handleWithdraw}
                withdrawing={withdrawingId === s.sessionId}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "invited" && (
        <div className="space-y-2" data-testid="invited-list">
          {upcomingLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredInvited.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-invited">{hasActiveFilters ? "No invites match your filters" : "No session invitations"}</p>
            </CardContent></Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground px-1">
                You have been invited to {filteredInvited.length} session{filteredInvited.length !== 1 ? "s" : ""}. View session details to accept or decline.
              </p>
              {filteredInvited.map(s => (
                <InvitedSessionCard
                  key={s.signupId}
                  session={s}
                  onWithdraw={handleWithdraw}
                  withdrawing={withdrawingId === s.sessionId}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3" data-testid="history-list">
          {filteredHistory.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground px-1 flex-wrap" data-testid="history-filter-summary">
              <span>Showing <strong className="text-foreground">{filteredHistory.length}</strong> session{filteredHistory.length !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">{historyStats.totalWon}W</span>
                <span>-</span>
                <span className="text-red-400 font-medium">{historyStats.totalLost}L</span>
                {historyStats.totalGames > 0 && <span>({historyStats.winRate.toFixed(0)}%)</span>}
              </span>
            </div>
          )}

          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredHistory.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-history">{hasActiveFilters ? "No sessions match your filters" : "No session history yet"}</p>
            </CardContent></Card>
          ) : (
            filteredHistory.map(s => (
              <HistorySessionCard key={s.sessionId} session={s} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
