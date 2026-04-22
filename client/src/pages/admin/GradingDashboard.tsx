import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Lock,
  Trophy, AlertTriangle, Activity, Search, Loader2, Eye, History,
  Users, Crown, Building2, Sparkles, Download, Flame, Snowflake, ShieldCheck,
  ChevronUp, ChevronDown, Calendar, Brain, Target, Zap, Award, Swords,
} from "lucide-react";
import { format } from "date-fns";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, AreaChart, Area,
} from "recharts";

const GRADE_ORDER = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
const gradeIndex = (g: string) => GRADE_ORDER.indexOf(g);

function gradeColour(grade: string) {
  if (grade.startsWith("A")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
  if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40";
  if (grade.startsWith("C")) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40";
  return "bg-muted text-muted-foreground";
}

function formatPct(n: number) { return `${(n * 100).toFixed(0)}%`; }
function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM yyyy");
}

type GradingStatus = "LOCKED" | "PROTECTED" | "READY_TO_MOVE_UP" | "NEEDS_REVIEW" | "STABLE" | "BUILDING_PROFILE";
const STATUS_LABEL: Record<GradingStatus, string> = {
  LOCKED: "Locked",
  PROTECTED: "Protected",
  READY_TO_MOVE_UP: "Ready to Move Up",
  NEEDS_REVIEW: "Needs Review",
  STABLE: "Stable",
  BUILDING_PROFILE: "Building Profile",
};

interface PlayerRow {
  profileId: number;
  userId: number;
  fullName: string;
  email: string;
  profilePictureUrl: string | null;
  gender: string | null;
  grade: string;
  previousGrade: string | null;
  highestGrade: string;
  adminLocked: boolean;
  joinedAt: string;
  totalSessionsAllTime: number;
  totalGamesAllTime: number;
  last10Form: ("W" | "L")[];
  streak: { type: "W" | "L" | null; count: number };
  promotionReadiness: number;
  demotionRiskScore: number;
  reasonTags: string[];
  status: GradingStatus;
  isProtected: boolean;
  isReturning: boolean;
  promotionStreak: number;
  demotionStreak: number;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    sessionsCounted: number;
    winRate: number;
    rawWinRate?: number;
    promotionEligible: boolean;
    demotionRisk: boolean;
  } | null;
  lastChange: {
    id: number;
    oldGrade: string;
    newGrade: string;
    direction: string;
    trigger: string;
    winRate: number | null;
    changedByName: string | null;
    createdAt: string;
  } | null;
}

interface ClubData {
  club: { id: number; name: string; autoGradingEnabled: boolean };
  summary: {
    totalPlayers: number;
    promotionEligible: number;
    demotionRisk: number;
    adminLocked: number;
    inactiveCount: number;
    recentPromotions: number;
    recentDemotions: number;
    recentManualChanges: number;
    gradeDistribution: Record<string, number>;
    avgWinRate: number;
  };
  rows: PlayerRow[];
  monthlyTrends: { month: string; promotions: number; demotions: number; manual: number }[];
  insights: string[];
  topImprover: { profileId: number; fullName: string; winRate: number; grade: string } | null;
  mostAtRisk: { profileId: number; fullName: string; winRate: number; grade: string } | null;
}

interface OverviewData {
  executive: {
    totalActivePlayers: number;
    promotionsThisMonth: number;
    demotionsThisMonth: number;
    lockedProfiles: number;
    avgWinRate: number;
    topImprover: { profileId: number; fullName: string; winRate: number; grade: string; clubName: string } | null;
    mostAtRisk: { profileId: number; fullName: string; winRate: number; grade: string; clubName: string } | null;
    mostActiveClub: { clubId: number; clubName: string; activePlayers: number } | null;
  } | null;
  perClub: Array<{
    clubId: number;
    clubName: string;
    autoGradingEnabled: boolean;
    totalPlayers: number;
    activePlayers: number;
    inactivePlayers: number;
    avgWinRate: number;
    promotionEligible: number;
    demotionRisk: number;
    adminLocked: number;
    recentPromotions: number;
    recentDemotions: number;
    recentManualChanges: number;
    topImprover: { profileId: number; fullName: string; winRate: number; grade: string } | null;
  }>;
  monthlyTrends: { month: string; promotions: number; demotions: number; manual: number }[];
  gradeDistribution: Record<string, number>;
  clubs: { id: number; name: string }[];
}

interface ProgressData {
  profile: {
    profileId: number;
    fullName: string;
    profilePictureUrl: string | null;
    grade: string;
    adminLocked: boolean;
    gradingResetAt: string | null;
  };
  currentStats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    sessionsCounted: number;
    winRate: number;
    rawWinRate?: number;
    promotionEligible: boolean;
    demotionRisk: boolean;
    status?: GradingStatus;
    isProtected?: boolean;
    isReturning?: boolean;
    promotionStreak: number;
    demotionStreak: number;
    promotionThreshold: number;
    promotionFastThreshold: number;
    demotionThreshold: number;
    demotionFastThreshold: number;
    minGames: number;
    minSessions: number;
    rollingWindowSessions: number;
  };
  history: Array<{
    id: number;
    oldGrade: string;
    newGrade: string;
    direction: string;
    trigger: string;
    winRate: number | null;
    gamesPlayed: number | null;
    gamesWon: number | null;
    sessionsCounted: number | null;
    note: string | null;
    changedByName: string | null;
    createdAt: string;
  }>;
  recentMatches: Array<{
    matchId: number;
    sessionName: string | null;
    sessionDate: string | null;
    scoreA: number; scoreB: number;
    setsWonA: number; setsWonB: number;
    numberOfSets: number;
    side: "A" | "B"; won: boolean; isTie?: boolean;
    opponents?: Array<{ id: number; fullName: string; grade: string | null; profilePictureUrl: string | null }>;
    opponentGradeAvg?: string | null;
    relationship?: "HIGHER" | "SAME" | "LOWER";
    weight?: number;
    weightedImpact?: number;
  }>;
  recentSessions: Array<{ id: number; name: string; date: string }>;
  momentum?: Array<{ idx: number; date: string | null; result: "W" | "L" | "T"; impact: number; cumulative: number }>;
  opponentBreakdown?: { higher: { wins: number; losses: number }; same: { wins: number; losses: number }; lower: { wins: number; losses: number } };
  insights?: Array<{ tone: "positive" | "warning" | "neutral" | "info"; text: string }>;
}

type FilterKey =
  | "all" | "promotion" | "demotion" | "locked" | "recent"
  | "manual" | "inactive" | "active" | "newMembers"
  | "highWinRate" | "lowWinRate";

type SortKey = "name" | "grade" | "winRate" | "promotionReadiness" | "demotionRiskScore" | "totalGamesAllTime" | "lastChange";

export default function GradingDashboard() {
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const [clubId, setClubId] = useState<string>("ALL");
  const [tab, setTab] = useState<"overview" | "players" | "trends" | "clubs">("overview");
  const [openProfileId, setOpenProfileId] = useState<number | null>(null);

  // Default: first single club if only one, else ALL
  useEffect(() => {
    if (adminClubs && adminClubs.length === 1) setClubId(String(adminClubs[0].id));
  }, [adminClubs]);

  const isAllClubs = clubId === "ALL";
  const showMultiClubTab = (adminClubs?.length || 0) > 1;

  const overviewQ = useQuery<OverviewData>({
    queryKey: ["/api/admin/grading-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/grading-overview", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load overview");
      return res.json();
    },
  });

  const clubQ = useQuery<ClubData>({
    queryKey: ["/api/admin/clubs", clubId, "grading-dashboard"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clubs/${clubId}/grading-dashboard`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load club dashboard");
      return res.json();
    },
    enabled: !isAllClubs && !!clubId,
  });

  // Aggregate "All Clubs" view from overview
  const aggregatedRows = useMemo<PlayerRow[]>(() => {
    // For All-Clubs view we don't fetch individual rows from each club
    // (saves load). Instead the players tab shows a hint to pick a club.
    return [];
  }, []);

  const activeClubData: ClubData | null = (!isAllClubs ? clubQ.data : null) ?? null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6" data-testid="page-grading">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Player Grading Progress
            </h1>
            <p className="text-muted-foreground">
              Live performance, history and progression intelligence across all your clubs.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger className="w-[240px]" data-testid="select-club">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(adminClubs?.length || 0) > 1 && (
                  <SelectItem value="ALL" data-testid="select-club-option-all">All Clubs (overview)</SelectItem>
                )}
                {adminClubs?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} data-testid={`select-club-option-${c.id}`}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Crown className="h-4 w-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="players" data-testid="tab-players">
              <Users className="h-4 w-4 mr-1.5" /> Players
            </TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">
              <Activity className="h-4 w-4 mr-1.5" /> Trends
            </TabsTrigger>
            <TabsTrigger value="clubs" data-testid="tab-clubs" disabled={!showMultiClubTab}>
              <Building2 className="h-4 w-4 mr-1.5" /> Clubs
            </TabsTrigger>
          </TabsList>

          {/* === OVERVIEW === */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {isAllClubs
              ? <ExecutiveOverview overview={overviewQ.data} loading={overviewQ.isLoading} />
              : <ClubOverview data={activeClubData} loading={clubQ.isLoading} onOpenPlayer={setOpenProfileId} />}
          </TabsContent>

          {/* === PLAYERS === */}
          <TabsContent value="players" className="mt-4">
            {isAllClubs ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Select a single club from the picker above to see the player table.</p>
                </CardContent>
              </Card>
            ) : (
              <PlayersTable data={activeClubData} loading={clubQ.isLoading} onOpenPlayer={setOpenProfileId} />
            )}
          </TabsContent>

          {/* === TRENDS === */}
          <TabsContent value="trends" className="space-y-4 mt-4">
            <TrendsView
              monthlyTrends={isAllClubs ? overviewQ.data?.monthlyTrends || [] : activeClubData?.monthlyTrends || []}
              gradeDistribution={isAllClubs
                ? overviewQ.data?.gradeDistribution || {}
                : activeClubData?.summary.gradeDistribution || {}}
              loading={isAllClubs ? overviewQ.isLoading : clubQ.isLoading}
            />
          </TabsContent>

          {/* === CLUBS === */}
          <TabsContent value="clubs" className="mt-4">
            <MultiClubPanel overview={overviewQ.data} loading={overviewQ.isLoading} onOpenClub={(id) => { setClubId(String(id)); setTab("overview"); }} />
          </TabsContent>
        </Tabs>

        <PlayerProgressDialog profileId={openProfileId} onClose={() => setOpenProfileId(null)} />
      </div>
    </TooltipProvider>
  );
}

// =====================================================================
// EXECUTIVE OVERVIEW (All Clubs)
// =====================================================================
function ExecutiveOverview({ overview, loading }: { overview: OverviewData | undefined; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!overview || !overview.executive) return <EmptyState message="No clubs found." />;
  const e = overview.executive;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Users className="h-5 w-5 text-primary" />} label="Active Players" value={e.totalActivePlayers} />
        <KpiCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="Promotions (30d)" value={e.promotionsThisMonth} />
        <KpiCard icon={<TrendingDown className="h-5 w-5 text-orange-500" />} label="Demotions (30d)" value={e.demotionsThisMonth} />
        <KpiCard icon={<Lock className="h-5 w-5 text-purple-500" />} label="Locked Profiles" value={e.lockedProfiles} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <SpotlightCard
          icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
          label="Top Improver"
          name={e.topImprover?.fullName || "—"}
          sub={e.topImprover ? `${formatPct(e.topImprover.winRate)} · ${e.topImprover.grade} · ${e.topImprover.clubName}` : "Not enough data"}
          tone="emerald"
          testId="card-top-improver"
        />
        <SpotlightCard
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          label="Most At Risk"
          name={e.mostAtRisk?.fullName || "—"}
          sub={e.mostAtRisk ? `${formatPct(e.mostAtRisk.winRate)} · ${e.mostAtRisk.grade} · ${e.mostAtRisk.clubName}` : "Not enough data"}
          tone="orange"
          testId="card-most-risk"
        />
        <SpotlightCard
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
          label="Most Active Club"
          name={e.mostActiveClub?.clubName || "—"}
          sub={e.mostActiveClub ? `${e.mostActiveClub.activePlayers} active players` : ""}
          tone="blue"
          testId="card-most-active-club"
        />
        <SpotlightCard
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          label="Avg Win Rate"
          name={formatPct(e.avgWinRate)}
          sub="Across all rated matches"
          tone="amber"
          testId="card-avg-winrate"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Monthly Movement Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={overview.monthlyTrends} />
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// CLUB OVERVIEW (single club)
// =====================================================================
function ClubOverview({ data, loading, onOpenPlayer }: { data: ClubData | null; loading: boolean; onOpenPlayer: (id: number) => void }) {
  if (loading) return <LoadingState />;
  if (!data) return <EmptyState message="Pick a club to begin." />;
  const s = data.summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Users className="h-5 w-5 text-primary" />} label="Total Players" value={s.totalPlayers} />
        <KpiCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="Promotion Ready" value={s.promotionEligible} hint="55%+ win rate" />
        <KpiCard icon={<TrendingDown className="h-5 w-5 text-orange-500" />} label="Demotion Risk" value={s.demotionRisk} hint="40% or below" />
        <KpiCard icon={<Lock className="h-5 w-5 text-purple-500" />} label="Locked" value={s.adminLocked} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="Promotions (30d)" value={s.recentPromotions} />
        <KpiCard icon={<TrendingDown className="h-5 w-5 text-orange-500" />} label="Demotions (30d)" value={s.recentDemotions} />
        <KpiCard icon={<Activity className="h-5 w-5 text-blue-500" />} label="Manual Changes" value={s.recentManualChanges} />
        <KpiCard icon={<Snowflake className="h-5 w-5 text-slate-500" />} label="Inactive 30+ Days" value={s.inactiveCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {data.topImprover && (
          <SpotlightCard
            icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
            label="Top Improver"
            name={data.topImprover.fullName}
            sub={`${formatPct(data.topImprover.winRate)} · ${data.topImprover.grade}`}
            tone="emerald"
            onClick={() => onOpenPlayer(data.topImprover!.profileId)}
            testId="card-club-top"
          />
        )}
        {data.mostAtRisk && (
          <SpotlightCard
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            label="Most At Risk"
            name={data.mostAtRisk.fullName}
            sub={`${formatPct(data.mostAtRisk.winRate)} · ${data.mostAtRisk.grade}`}
            tone="orange"
            onClick={() => onOpenPlayer(data.mostAtRisk!.profileId)}
            testId="card-club-risk"
          />
        )}
        <SpotlightCard
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          label="Avg Win Rate"
          name={formatPct(s.avgWinRate)}
          sub={`${data.club.autoGradingEnabled ? "Auto grading: ON" : "Auto grading: OFF"}`}
          tone="amber"
          testId="card-club-winrate"
        />
      </div>

      {data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Smart Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.insights.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm p-3 rounded-lg border bg-muted/30" data-testid={`insight-${idx}`}>
                  <span className="text-primary mt-0.5">●</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Monthly Movement Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={data.monthlyTrends} />
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// PLAYERS TABLE
// =====================================================================
function PlayersTable({ data, loading, onOpenPlayer }: { data: ClubData | null; loading: boolean; onOpenPlayer: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("winRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = [...data.rows];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(r => r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    if (gradeFilter !== "ALL") rows = rows.filter(r => r.grade === gradeFilter);

    const now = Date.now();
    const day30 = 30 * 86_400_000;
    switch (filter) {
      case "promotion": rows = rows.filter(r => r.stats?.promotionEligible); break;
      case "demotion": rows = rows.filter(r => r.stats?.demotionRisk); break;
      case "locked": rows = rows.filter(r => r.adminLocked); break;
      case "recent": rows = rows.filter(r => r.lastChange); break;
      case "manual": rows = rows.filter(r => r.lastChange?.trigger === "MANUAL"); break;
      case "active": rows = rows.filter(r => (r.stats?.gamesPlayed || 0) > 0); break;
      case "inactive": rows = rows.filter(r => (r.totalGamesAllTime || 0) === 0 || (r.stats?.gamesPlayed || 0) === 0); break;
      case "newMembers": rows = rows.filter(r => (now - new Date(r.joinedAt).getTime()) < day30); break;
      case "highWinRate": rows = rows.filter(r => (r.stats?.winRate || 0) >= 0.6 && (r.stats?.gamesPlayed || 0) >= 5); break;
      case "lowWinRate": rows = rows.filter(r => (r.stats?.gamesPlayed || 0) >= 5 && (r.stats?.winRate || 0) <= 0.4); break;
    }

    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sort) {
        case "name": return a.fullName.localeCompare(b.fullName) * dir;
        case "grade": return (gradeIndex(a.grade) - gradeIndex(b.grade)) * dir;
        case "winRate": return ((a.stats?.winRate || 0) - (b.stats?.winRate || 0)) * dir;
        case "promotionReadiness": return (a.promotionReadiness - b.promotionReadiness) * dir;
        case "demotionRiskScore": return (a.demotionRiskScore - b.demotionRiskScore) * dir;
        case "totalGamesAllTime": return (a.totalGamesAllTime - b.totalGamesAllTime) * dir;
        case "lastChange": {
          const at = a.lastChange ? new Date(a.lastChange.createdAt).getTime() : 0;
          const bt = b.lastChange ? new Date(b.lastChange.createdAt).getTime() : 0;
          return (at - bt) * dir;
        }
      }
    });
    return rows;
  }, [data, search, filter, gradeFilter, sort, sortDir]);

  const exportCsv = () => {
    if (!data) return;
    const header = [
      "Name", "Email", "Grade", "Previous Grade", "Highest Grade", "Win Rate %",
      "Wins", "Losses", "Games (window)", "Sessions", "All-Time Games",
      "All-Time Sessions", "Streak", "Promotion Readiness %", "Demotion Risk %",
      "Status", "Last Change", "Reasons",
    ];
    const lines = [header.join(",")];
    for (const r of filteredRows) {
      const status = r.adminLocked ? "Locked"
        : r.stats?.promotionEligible ? "Promote"
        : r.stats?.demotionRisk ? "At Risk" : "Stable";
      const lc = r.lastChange ? `${r.lastChange.oldGrade}->${r.lastChange.newGrade} (${r.lastChange.trigger})` : "";
      const cells = [
        r.fullName, r.email, r.grade, r.previousGrade || "", r.highestGrade,
        r.stats ? Math.round(r.stats.winRate * 100) : 0,
        r.stats?.gamesWon ?? 0, r.stats?.gamesLost ?? 0, r.stats?.gamesPlayed ?? 0, r.stats?.sessionsCounted ?? 0,
        r.totalGamesAllTime, r.totalSessionsAllTime,
        r.streak.type ? `${r.streak.count}${r.streak.type}` : "",
        r.promotionReadiness, r.demotionRiskScore, status, lc, r.reasonTags.join(" | "),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grading-${data.club.name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(key); setSortDir("desc"); }
  };
  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)} data-testid={`sort-${k}`}>
        {label}
        {sort === k && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState message="Pick a club to begin." />;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> {data.club.name} — Players
            </CardTitle>
            <p className="text-xs text-muted-foreground">{filteredRows.length} of {data.rows.length} shown</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search players..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="promotion">Promotion Ready</SelectItem>
                <SelectItem value="demotion">Demotion Risk</SelectItem>
                <SelectItem value="highWinRate">Highest Win Rate</SelectItem>
                <SelectItem value="lowWinRate">Lowest Win Rate</SelectItem>
                <SelectItem value="active">Most Active</SelectItem>
                <SelectItem value="inactive">No Recent Games</SelectItem>
                <SelectItem value="newMembers">New (30 days)</SelectItem>
                <SelectItem value="manual">Manual Overrides</SelectItem>
                <SelectItem value="recent">Recently Changed</SelectItem>
                <SelectItem value="locked">Admin-Locked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[120px]" data-testid="select-grade-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Grades</SelectItem>
                {GRADE_ORDER.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} data-testid="button-export"><Download className="h-4 w-4 mr-1" /> CSV</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead k="name" label="Player" />
                <SortHead k="grade" label="Grade" />
                <SortHead k="winRate" label="Win Rate" className="text-center" />
                <TableHead className="text-center">W-L</TableHead>
                <TableHead className="text-center">Form (last 10)</TableHead>
                <TableHead className="text-center">Streak</TableHead>
                <SortHead k="promotionReadiness" label="Promo %" className="text-center" />
                <SortHead k="demotionRiskScore" label="Risk %" className="text-center" />
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <SortHead k="lastChange" label="Last Change" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={r.profileId} className="cursor-pointer hover-elevate" onClick={() => onOpenPlayer(r.profileId)} data-testid={`row-player-${r.profileId}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.profilePictureUrl || undefined} />
                        <AvatarFallback>{r.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium" data-testid={`text-name-${r.profileId}`}>{r.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={gradeColour(r.grade)} data-testid={`badge-grade-${r.profileId}`}>{r.grade}</Badge>
                      {r.previousGrade && r.previousGrade !== r.grade && (
                        <span className="text-[10px] text-muted-foreground">from {r.previousGrade}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {r.stats && r.stats.gamesPlayed > 0 ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{formatPct(r.stats.winRate)}</div>
                        <Progress value={r.stats.winRate * 100} className="h-1.5 w-20 mx-auto" />
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center text-sm whitespace-nowrap">
                    {r.stats ? (
                      <span><span className="text-emerald-600 font-medium">{r.stats.gamesWon}</span><span className="text-muted-foreground">-</span><span className="text-red-600 font-medium">{r.stats.gamesLost}</span></span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-center"><FormDots form={r.last10Form} /></TableCell>
                  <TableCell className="text-center">
                    {r.streak.count > 0 ? (
                      <Badge variant="outline" className={r.streak.type === "W" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/40"}>
                        {r.streak.type === "W" ? <Flame className="h-3 w-3 mr-0.5" /> : <Snowflake className="h-3 w-3 mr-0.5" />}
                        {r.streak.count}{r.streak.type}
                      </Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <ReadinessBar value={r.promotionReadiness} colour="emerald" />
                  </TableCell>
                  <TableCell className="text-center">
                    <ReadinessBar value={r.demotionRiskScore} colour="orange" />
                  </TableCell>
                  <TableCell><StatusBadges row={r} /></TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="flex flex-wrap gap-1">
                      {r.reasonTags.slice(0, 2).map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                      {r.reasonTags.length > 2 && (
                        <UiTooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px]">+{r.reasonTags.length - 2}</Badge>
                          </TooltipTrigger>
                          <TooltipContent><div className="max-w-[260px] space-y-1">{r.reasonTags.slice(2).map((t, i) => <div key={i} className="text-xs">• {t}</div>)}</div></TooltipContent>
                        </UiTooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.lastChange ? (
                      <div>
                        <div className="flex items-center gap-1">
                          {r.lastChange.direction === "PROMOTION" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            : r.lastChange.direction === "DEMOTION" ? <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
                            : <Activity className="h-3.5 w-3.5 text-blue-500" />}
                          <span>{r.lastChange.oldGrade} → <b>{r.lastChange.newGrade}</b></span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{format(new Date(r.lastChange.createdAt), "d MMM yyyy")} · {r.lastChange.trigger}</div>
                      </div>
                    ) : <span className="text-muted-foreground">No changes</span>}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No players match your filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// TRENDS
// =====================================================================
function TrendsView({ monthlyTrends, gradeDistribution, loading }: { monthlyTrends: any[]; gradeDistribution: Record<string, number>; loading: boolean }) {
  if (loading) return <LoadingState />;
  const distribution = GRADE_ORDER.map(g => ({ grade: g, count: gradeDistribution[g] || 0 }));
  const hasDistribution = distribution.some(d => d.count > 0);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Promotions vs Demotions (12 months)</CardTitle></CardHeader>
        <CardContent>
          <MonthlyTrendChart data={monthlyTrends} />
        </CardContent>
      </Card>
      {hasDistribution && (
        <Card>
          <CardHeader><CardTitle className="text-base">Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="grade" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MonthlyTrendChart({ data }: { data: any[] }) {
  const formatted = data.map(d => ({ ...d, label: formatMonth(d.month) }));
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="promotions" stroke="rgb(16 185 129)" strokeWidth={2.5} name="Promotions" />
          <Line type="monotone" dataKey="demotions" stroke="rgb(249 115 22)" strokeWidth={2.5} name="Demotions" />
          <Line type="monotone" dataKey="manual" stroke="rgb(59 130 246)" strokeWidth={2} strokeDasharray="4 4" name="Manual" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// =====================================================================
// MULTI-CLUB
// =====================================================================
function MultiClubPanel({ overview, loading, onOpenClub }: { overview: OverviewData | undefined; loading: boolean; onOpenClub: (id: number) => void }) {
  if (loading) return <LoadingState />;
  if (!overview || overview.perClub.length === 0) return <EmptyState message="No clubs available." />;
  const sorted = [...overview.perClub].sort((a, b) => b.activePlayers - a.activePlayers);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Multi-Club Control Panel</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead className="text-center">Players</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Avg Win Rate</TableHead>
                <TableHead className="text-center">Promotion Ready</TableHead>
                <TableHead className="text-center">At Risk</TableHead>
                <TableHead className="text-center">30d Promotions</TableHead>
                <TableHead className="text-center">30d Demotions</TableHead>
                <TableHead>Top Improver</TableHead>
                <TableHead className="text-center">Auto Grading</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(c => (
                <TableRow key={c.clubId} data-testid={`row-club-${c.clubId}`}>
                  <TableCell className="font-medium">{c.clubName}</TableCell>
                  <TableCell className="text-center">{c.totalPlayers}</TableCell>
                  <TableCell className="text-center">{c.activePlayers}</TableCell>
                  <TableCell className="text-center">{formatPct(c.avgWinRate)}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">{c.promotionEligible}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/40">{c.demotionRisk}</Badge></TableCell>
                  <TableCell className="text-center">{c.recentPromotions}</TableCell>
                  <TableCell className="text-center">{c.recentDemotions}</TableCell>
                  <TableCell className="text-sm">{c.topImprover ? <span>{c.topImprover.fullName} <span className="text-muted-foreground">({formatPct(c.topImprover.winRate)})</span></span> : "—"}</TableCell>
                  <TableCell className="text-center">{c.autoGradingEnabled ? <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">ON</Badge> : <Badge variant="outline">OFF</Badge>}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => onOpenClub(c.clubId)} data-testid={`button-open-${c.clubId}`}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// PRIMITIVES
// =====================================================================
function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/80 border-border/50 backdrop-blur hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
            <div className="rounded-lg bg-primary/10 p-1.5">{icon}</div>
          </div>
          <div className="text-3xl font-bold tabular-nums tracking-tight"><AnimatedNumber value={value} /></div>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SpotlightCard({ icon, label, name, sub, tone, onClick, testId }: { icon: React.ReactNode; label: string; name: string; sub?: string; tone: "emerald" | "orange" | "blue" | "amber"; onClick?: () => void; testId?: string }) {
  const toneClass = {
    emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    orange: "from-orange-500/15 to-orange-500/5 border-orange-500/30",
    blue: "from-blue-500/15 to-blue-500/5 border-blue-500/30",
    amber: "from-amber-500/15 to-amber-500/5 border-amber-500/30",
  }[tone];
  return (
    <Card className={`bg-gradient-to-br ${toneClass} ${onClick ? "cursor-pointer hover-elevate" : ""}`} onClick={onClick} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</span></div>
        <div className="text-lg font-bold truncate">{name}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function FormDots({ form }: { form: ("W" | "L")[] }) {
  if (form.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="inline-flex items-center gap-0.5">
      {form.map((f, i) => (
        <span key={i} className={`inline-block w-2 h-2 rounded-full ${f === "W" ? "bg-emerald-500" : "bg-red-500"}`} title={f} />
      ))}
    </div>
  );
}

function ReadinessBar({ value, colour }: { value: number; colour: "emerald" | "orange" }) {
  const fill = colour === "emerald" ? "bg-emerald-500" : "bg-orange-500";
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold">{value}%</div>
      <div className="relative h-1.5 w-16 mx-auto rounded-full bg-muted overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatusBadges({ row }: { row: PlayerRow }) {
  const map: Record<GradingStatus, { className: string; icon: React.ReactNode }> = {
    LOCKED: { className: "bg-purple-500/15 text-purple-600 border-purple-500/40", icon: <Lock className="h-3 w-3" /> },
    PROTECTED: { className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40", icon: <ShieldCheck className="h-3 w-3" /> },
    READY_TO_MOVE_UP: { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40", icon: <ArrowUpRight className="h-3 w-3" /> },
    NEEDS_REVIEW: { className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40", icon: <ArrowDownRight className="h-3 w-3" /> },
    STABLE: { className: "bg-muted text-muted-foreground", icon: <ShieldCheck className="h-3 w-3" /> },
    BUILDING_PROFILE: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30", icon: <Activity className="h-3 w-3" /> },
  };
  const cfg = map[row.status] || map.STABLE;
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="outline" className={`${cfg.className} gap-1`} data-testid={`status-${row.status.toLowerCase()}`}>
        {cfg.icon}
        {STATUS_LABEL[row.status]}
      </Badge>
      {row.isReturning && row.status !== "PROTECTED" && (
        <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 gap-1">Welcome back</Badge>
      )}
    </div>
  );
}

function LoadingState() {
  return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}
function EmptyState({ message }: { message: string }) {
  return <Card><CardContent className="py-16 text-center text-muted-foreground">{message}</CardContent></Card>;
}

// =====================================================================
// PLAYER DIALOG
// =====================================================================
// =====================================================================
// PREMIUM PLAYER PROGRESS DIALOG (v2)
// =====================================================================
function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${v.toFixed(decimals)}${suffix}`);
  const [display, setDisplay] = useState(`${(0).toFixed(decimals)}${suffix}`);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, decimals, suffix]);
  return <span>{display}</span>;
}

function CircularProgressRing({ value, size = 140, stroke = 12, color = "hsl(142 76% 45%)", label, sublabel }: { value: number; size?: number; stroke?: number; color?: string; label?: string; sublabel?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dashOffset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} className="opacity-40" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>
          <AnimatedNumber value={clamped} suffix="%" />
        </div>
        {label && <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>}
        {sublabel && <div className="text-[10px] text-muted-foreground">{sublabel}</div>}
      </div>
    </div>
  );
}

function ImpactPill({ rel, weight, won, isTie }: { rel?: "HIGHER" | "SAME" | "LOWER"; weight?: number; won: boolean; isTie?: boolean }) {
  if (isTie) return <Badge variant="outline" className="bg-muted text-muted-foreground">Tie · skipped</Badge>;
  const tone = won
    ? rel === "HIGHER" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
      : rel === "LOWER" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
    : rel === "LOWER" ? "bg-red-500/20 text-red-600 border-red-500/40"
      : rel === "HIGHER" ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
      : "bg-orange-500/15 text-orange-600 border-orange-500/40";
  const label = won
    ? rel === "HIGHER" ? "Strong push up" : rel === "LOWER" ? "Expected win" : "Solid win"
    : rel === "LOWER" ? "Risk trigger" : rel === "HIGHER" ? "Minimal damage" : "Setback";
  const sign = won ? "+" : "−";
  return <Badge variant="outline" className={`${tone} gap-1 whitespace-nowrap`}>{sign}{(weight || 1).toFixed(2)} · {label}</Badge>;
}

function relColor(rel?: string) {
  if (rel === "HIGHER") return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40";
  if (rel === "LOWER") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40";
  return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40";
}

function PlayerProgressDialog({ profileId, onClose }: { profileId: number | null; onClose: () => void }) {
  const { data, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/admin/player-profiles", profileId, "grade-progress"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/player-profiles/${profileId}/grade-progress`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load progress");
      return res.json();
    },
    enabled: !!profileId,
  });

  const last10 = useMemo(() => data ? data.recentMatches.slice(0, 10).map(m => m.won ? "W" : "L") as ("W" | "L")[] : [], [data]);
  const last30Rate = useMemo(() => {
    if (!data) return 0;
    const slice = data.recentMatches.slice(0, 30).filter(m => !m.isTie);
    if (slice.length === 0) return 0;
    return Math.round((slice.filter(m => m.won).length / slice.length) * 100);
  }, [data]);
  const last10Rate = useMemo(() => {
    if (!data) return 0;
    const slice = data.recentMatches.slice(0, 10).filter(m => !m.isTie);
    if (slice.length === 0) return 0;
    return Math.round((slice.filter(m => m.won).length / slice.length) * 100);
  }, [data]);

  const promoProb = useMemo(() => {
    if (!data) return 0;
    const s = data.currentStats;
    if (s.promotionEligible) return 100;
    const activity = Math.min(1, Math.min(s.gamesPlayed / s.minGames, s.sessionsCounted / s.minSessions));
    const slow = ((s.winRate - s.demotionThreshold) / (s.promotionThreshold - s.demotionThreshold)) * 100;
    let base = activity * Math.max(0, Math.min(100, slow));
    if (s.promotionStreak >= 1 && s.winRate >= s.promotionThreshold) base = Math.max(base, 80);
    return Math.round(base);
  }, [data]);

  const demoProb = useMemo(() => {
    if (!data) return 0;
    const s = data.currentStats;
    if (s.isProtected || s.isReturning) return 0;
    if (s.demotionRisk) return 100;
    const activity = Math.min(1, Math.min(s.gamesPlayed / s.minGames, s.sessionsCounted / s.minSessions));
    const slow = ((s.promotionThreshold - s.winRate) / (s.promotionThreshold - s.demotionThreshold)) * 100;
    let base = activity * Math.max(0, Math.min(100, slow));
    if (s.demotionStreak >= 1 && s.winRate < s.demotionThreshold + 0.05) base = Math.max(base, 70);
    return Math.round(base);
  }, [data]);

  const timelineData = useMemo(() => {
    if (!data) return [];
    const chronological = [...data.history].reverse();
    const points = chronological.map(h => ({
      date: format(new Date(h.createdAt), "d MMM yy"),
      gradeIdx: gradeIndex(h.newGrade),
      grade: h.newGrade,
      winRate: h.winRate ?? null,
    }));
    if (data.profile.grade) {
      points.push({ date: "Now", gradeIdx: gradeIndex(data.profile.grade), grade: data.profile.grade, winRate: Math.round(data.currentStats.winRate * 100) });
    }
    return points;
  }, [data]);

  const breakdownData = useMemo(() => {
    if (!data?.opponentBreakdown) return [];
    const b = data.opponentBreakdown;
    return [
      { name: "vs Higher", wins: b.higher.wins, losses: b.higher.losses },
      { name: "vs Same", wins: b.same.wins, losses: b.same.losses },
      { name: "vs Lower", wins: b.lower.wins, losses: b.lower.losses },
    ];
  }, [data]);

  return (
    <Dialog open={!!profileId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto p-0 gap-0 border-border/40" data-testid="dialog-progress">
        {isLoading || !data ? (
          <div className="py-20"><LoadingState /></div>
        ) : (
          <>
            {/* HERO HEADER with gradient + glassmorphism */}
            <div className="relative overflow-hidden rounded-t-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.25),transparent_60%)]" />
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
              <DialogHeader className="relative p-6 pb-4">
                <DialogTitle asChild>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-primary/40 blur-md opacity-60" />
                      <Avatar className="relative h-20 w-20 ring-4 ring-background shadow-xl">
                        <AvatarImage src={data.profile.profilePictureUrl || undefined} />
                        <AvatarFallback className="text-2xl font-bold">{data.profile.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl md:text-3xl font-display font-bold tracking-tight" data-testid="text-player-name">{data.profile.fullName}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {(data.profile as any).previousGrade && (
                          <Badge variant="outline" className={`${gradeColour((data.profile as any).previousGrade)} opacity-60`}>{(data.profile as any).previousGrade}</Badge>
                        )}
                        {(data.profile as any).previousGrade && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                        <Badge variant="outline" className={`${gradeColour(data.profile.grade)} text-base font-bold px-3 py-1`}>{data.profile.grade}</Badge>
                        {(data.profile as any).highestGrade && (data.profile as any).highestGrade !== data.profile.grade && (
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                <Crown className="h-3 w-3" /> Peak {(data.profile as any).highestGrade}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Highest grade achieved</TooltipContent>
                          </UiTooltip>
                        )}
                        {data.currentStats.isProtected && <Badge variant="outline" className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40 gap-1"><ShieldCheck className="h-3 w-3" /> Protected</Badge>}
                        {data.currentStats.isReturning && <Badge variant="outline" className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40">Welcome back</Badge>}
                        {data.profile.adminLocked && <Badge variant="outline" className="bg-purple-500/15 text-purple-600 border-purple-500/40 gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
                      </div>
                    </div>
                    {/* Quick stats column */}
                    <div className="hidden md:flex flex-col items-end gap-1 text-right">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Sessions in window</div>
                      <div className="text-2xl font-bold tabular-nums"><AnimatedNumber value={data.currentStats.sessionsCounted} /></div>
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription className="mt-3 text-xs">
                  Window: last {data.currentStats.rollingWindowSessions} sessions (auto-expands to ≥20 matches) · Promotion ≥{(data.currentStats.promotionFastThreshold * 100).toFixed(0)}% or {(data.currentStats.promotionThreshold * 100).toFixed(0)}% × 2 checks · Demotion &lt;{(data.currentStats.demotionFastThreshold * 100).toFixed(0)}% or &lt;{(data.currentStats.demotionThreshold * 100).toFixed(0)}% × 2 checks
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 pt-2 space-y-5">
              {/* WIN RATE ENGINE — 3 circular rings + promo/demo */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Card className="lg:col-span-3 bg-gradient-to-br from-card to-card/50 backdrop-blur border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Win Rate Engine</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 place-items-center">
                      <CircularProgressRing value={Math.round(data.currentStats.winRate * 100)} color="hsl(142 76% 45%)" label="Window" sublabel="weighted" />
                      <CircularProgressRing value={last10Rate} color="hsl(199 89% 55%)" label="Last 10" sublabel="raw" />
                      <CircularProgressRing value={last30Rate} color="hsl(262 80% 60%)" label="Last 30" sublabel="raw" />
                    </div>
                    {data.currentStats.rawWinRate !== undefined && Math.abs(data.currentStats.rawWinRate - data.currentStats.winRate) > 0.02 && (
                      <div className="mt-3 text-xs text-center text-muted-foreground">
                        Raw win rate (unweighted): <span className="font-semibold text-foreground">{Math.round(data.currentStats.rawWinRate * 100)}%</span> · weighting reflects opponent strength
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-gradient-to-br from-card to-card/50 backdrop-blur border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Movement Probability</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1 text-emerald-600 font-medium"><ArrowUpRight className="h-3.5 w-3.5" /> Promotion</span>
                        <span className="text-2xl font-bold text-emerald-600 tabular-nums"><AnimatedNumber value={promoProb} suffix="%" /></span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${promoProb}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                      </div>
                      {data.currentStats.promotionStreak >= 1 && !data.currentStats.promotionEligible && (
                        <div className="text-[11px] text-emerald-600 mt-1">Promotion check {data.currentStats.promotionStreak}/2 passed</div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1 text-orange-600 font-medium"><ArrowDownRight className="h-3.5 w-3.5" /> Demotion</span>
                        <span className="text-2xl font-bold text-orange-600 tabular-nums"><AnimatedNumber value={demoProb} suffix="%" /></span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${demoProb}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                      </div>
                      {data.currentStats.demotionStreak >= 1 && !data.currentStats.demotionRisk && !data.currentStats.isProtected && (
                        <div className="text-[11px] text-orange-600 mt-1">Demotion check {data.currentStats.demotionStreak}/2 triggered</div>
                      )}
                    </div>
                    {/* threshold bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        <span>{(data.currentStats.demotionFastThreshold * 100).toFixed(0)}%</span>
                        <span className="font-bold text-foreground">Now {(data.currentStats.winRate * 100).toFixed(0)}%</span>
                        <span>{(data.currentStats.promotionFastThreshold * 100).toFixed(0)}%</span>
                      </div>
                      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 via-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, data.currentStats.winRate * 100)}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${data.currentStats.demotionFastThreshold * 100}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500" style={{ left: `${data.currentStats.demotionThreshold * 100}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-400" style={{ left: `${data.currentStats.promotionThreshold * 100}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-600" style={{ left: `${data.currentStats.promotionFastThreshold * 100}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI INSIGHTS + LAST 10 FORM + KEY STATS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 bg-gradient-to-br from-violet-500/5 to-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(data.insights || []).map((ins, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${
                          ins.tone === "positive" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                          : ins.tone === "warning" ? "bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-200"
                          : ins.tone === "info" ? "bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-200"
                          : "bg-muted/50 border-border text-muted-foreground"
                        }`}
                        data-testid={`insight-${i}`}
                      >
                        {ins.tone === "positive" ? <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          : ins.tone === "warning" ? <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          : ins.tone === "info" ? <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          : <Activity className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                        <span>{ins.text}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /> Recent form</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormDots form={last10} />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="rounded-lg bg-muted/40 p-2 text-center">
                        <div className="text-xs text-muted-foreground">Games</div>
                        <div className="text-lg font-bold tabular-nums"><AnimatedNumber value={data.currentStats.gamesPlayed} /></div>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2 text-center">
                        <div className="text-xs text-muted-foreground">W–L</div>
                        <div className="text-lg font-bold tabular-nums">{data.currentStats.gamesWon}–{data.currentStats.gamesLost}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* MOMENTUM GRAPH */}
              {(data.momentum?.length || 0) > 1 && (
                <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Momentum (last {data.momentum!.length} matches)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.momentum}>
                          <defs>
                            <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: any, n: any) => [v, n === "cumulative" ? "Cumulative form" : n]} />
                          <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#momGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* OPPONENT DIFFICULTY BREAKDOWN */}
              {breakdownData.some(d => d.wins + d.losses > 0) && (
                <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /> Opponent Difficulty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={breakdownData} layout="vertical" margin={{ left: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="wins" stackId="a" fill="hsl(142 76% 45%)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="losses" stackId="a" fill="hsl(0 84% 60%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* MATCH IMPACT BREAKDOWN */}
              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Match impact in current window</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Session</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                        <TableHead>Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentMatches.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No completed matches in the current window.</TableCell></TableRow>
                      )}
                      {data.recentMatches.slice(0, 25).map(m => (
                        <TableRow key={m.matchId} data-testid={`match-row-${m.matchId}`}>
                          <TableCell className="text-sm">
                            <div className="font-medium">{m.sessionName || `#${m.matchId}`}</div>
                            <div className="text-xs text-muted-foreground">{m.sessionDate ? format(new Date(m.sessionDate), "d MMM") : "—"}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`${relColor(m.relationship)} text-[10px]`}>
                                {m.relationship === "HIGHER" ? "↑ Higher" : m.relationship === "LOWER" ? "↓ Lower" : "= Same"}
                              </Badge>
                              {m.opponentGradeAvg && <Badge variant="outline" className={`${gradeColour(m.opponentGradeAvg)} text-[10px]`}>{m.opponentGradeAvg}</Badge>}
                            </div>
                            {m.opponents && m.opponents.length > 0 && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[140px] mt-0.5">
                                {m.opponents.map(o => o.fullName).join(" / ")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium tabular-nums">{m.numberOfSets > 1 ? `${m.setsWonA}-${m.setsWonB}` : `${m.scoreA}-${m.scoreB}`}</TableCell>
                          <TableCell className="text-center">
                            {m.isTie ? <Badge variant="outline" className="bg-muted text-muted-foreground">Tie</Badge>
                              : m.won ? <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">Win</Badge>
                              : <Badge className="bg-red-500/20 text-red-600 border-red-500/40">Loss</Badge>}
                          </TableCell>
                          <TableCell><ImpactPill rel={m.relationship} weight={m.weight} won={m.won} isTie={m.isTie} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* GRADE JOURNEY (vertical timeline) */}
              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Grade Journey</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.history.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">No grade changes recorded yet.</div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary/60 before:via-primary/30 before:to-transparent">
                      {data.history.map((h, i) => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="relative"
                          data-testid={`history-row-${h.id}`}
                        >
                          <div className={`absolute -left-6 top-1.5 h-4 w-4 rounded-full ring-4 ring-background ${
                            h.direction === "PROMOTION" ? "bg-emerald-500" : h.direction === "DEMOTION" ? "bg-orange-500" : "bg-blue-500"
                          }`} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={`${gradeColour(h.oldGrade)} text-xs`}>{h.oldGrade}</Badge>
                                <ArrowUpRight className={`h-3.5 w-3.5 ${h.direction === "DEMOTION" ? "rotate-90 text-orange-500" : "text-emerald-500"}`} />
                                <Badge variant="outline" className={`${gradeColour(h.newGrade)} text-xs`}>{h.newGrade}</Badge>
                                <Badge variant={h.trigger === "MANUAL" ? "default" : "secondary"} className="text-[10px]">
                                  {h.trigger}{h.changedByName ? ` · ${h.changedByName}` : ""}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(h.createdAt), "d MMM yyyy · HH:mm")}
                                {h.winRate !== null && ` · ${h.winRate}% win rate`}
                                {h.gamesWon !== null && h.gamesPlayed !== null && ` · ${h.gamesWon}/${h.gamesPlayed} games`}
                              </div>
                              {h.note && <div className="text-xs text-muted-foreground mt-1 italic">"{h.note}"</div>}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {timelineData.length > 1 && (
                    <div className="h-[160px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, GRADE_ORDER.length - 1]} ticks={GRADE_ORDER.map((_, i) => i)} tickFormatter={(v) => GRADE_ORDER[v] || ""} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(_v: any, _n: any, props: any) => [props.payload.grade, "Grade"]} />
                          <Line type="stepAfter" dataKey="gradeIdx" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
