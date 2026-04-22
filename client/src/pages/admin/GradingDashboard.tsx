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
  ChevronUp, ChevronDown, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
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
    promotionEligible: boolean;
    demotionRisk: boolean;
    promotionThreshold: number;
    demotionThreshold: number;
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
    side: "A" | "B"; won: boolean;
  }>;
  recentSessions: Array<{ id: number; name: string; date: string }>;
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
          {icon}
        </div>
        <div className="text-3xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
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

  const last10 = useMemo(() => {
    if (!data) return [];
    return data.recentMatches.slice(0, 10).map(m => m.won ? "W" : "L") as ("W" | "L")[];
  }, [data]);

  const promoProb = useMemo(() => {
    if (!data) return 0;
    const s = data.currentStats;
    if (s.promotionEligible) return 100;
    const activity = Math.min(1, Math.min(s.gamesPlayed / s.minGames, s.sessionsCounted / s.minSessions));
    return Math.round(activity * Math.max(0, Math.min(100, ((s.winRate - s.demotionThreshold) / (s.promotionThreshold - s.demotionThreshold)) * 100)));
  }, [data]);

  const demoProb = useMemo(() => {
    if (!data) return 0;
    const s = data.currentStats;
    if (s.demotionRisk) return 100;
    const activity = Math.min(1, Math.min(s.gamesPlayed / s.minGames, s.sessionsCounted / s.minSessions));
    return Math.round(activity * Math.max(0, Math.min(100, ((s.promotionThreshold - s.winRate) / (s.promotionThreshold - s.demotionThreshold)) * 100)));
  }, [data]);

  return (
    <Dialog open={!!profileId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" data-testid="dialog-progress">
        {isLoading || !data ? (
          <LoadingState />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={data.profile.profilePictureUrl || undefined} />
                  <AvatarFallback>{data.profile.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{data.profile.fullName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={gradeColour(data.profile.grade)}>{data.profile.grade}</Badge>
                    {data.profile.adminLocked && <Badge variant="outline" className="bg-purple-500/15 text-purple-600 border-purple-500/40 gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription>Rolling window: last {data.currentStats.rollingWindowSessions} sessions · need {data.currentStats.minGames}+ games and {data.currentStats.minSessions}+ sessions for changes</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <StatBox label="Win Rate" value={formatPct(data.currentStats.winRate)} />
              <StatBox label="W-L" value={`${data.currentStats.gamesWon} - ${data.currentStats.gamesLost}`} />
              <StatBox label="Games (window)" value={String(data.currentStats.gamesPlayed)} />
              <StatBox label="Sessions" value={String(data.currentStats.sessionsCounted)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card><CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground mb-2">Last 10 form</div>
                <FormDots form={last10} />
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground mb-2">Promotion probability</div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-emerald-600">{promoProb}%</div>
                  <Progress value={promoProb} className="h-2 flex-1" />
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground mb-2">Demotion probability</div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-orange-600">{demoProb}%</div>
                  <Progress value={demoProb} className="h-2 flex-1" />
                </div>
              </CardContent></Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Demotion ≤ {formatPct(data.currentStats.demotionThreshold)}</span>
                  <span className="font-semibold text-foreground">Current: {formatPct(data.currentStats.winRate)}</span>
                  <span>Promotion ≥ {formatPct(data.currentStats.promotionThreshold)}</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-emerald-500" style={{ width: `${Math.min(100, data.currentStats.winRate * 100)}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500" style={{ left: `${data.currentStats.demotionThreshold * 100}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-500" style={{ left: `${data.currentStats.promotionThreshold * 100}%` }} />
                </div>
              </CardContent>
            </Card>

            {timelineData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Grade Journey</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, GRADE_ORDER.length - 1]} ticks={GRADE_ORDER.map((_, i) => i)} tickFormatter={(v) => GRADE_ORDER[v] || ""} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(_v: any, _n: any, props: any) => [props.payload.grade, "Grade"]} />
                        <Line type="stepAfter" dataKey="gradeIdx" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Grade Change History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead className="text-center">Win Rate</TableHead>
                      <TableHead className="text-center">Games</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.history.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No grade changes recorded yet.</TableCell></TableRow>
                    )}
                    {data.history.map(h => (
                      <TableRow key={h.id} data-testid={`history-row-${h.id}`}>
                        <TableCell className="text-xs">{format(new Date(h.createdAt), "d MMM yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {h.direction === "PROMOTION" ? <TrendingUp className="h-4 w-4 text-emerald-500" />
                              : h.direction === "DEMOTION" ? <TrendingDown className="h-4 w-4 text-orange-500" />
                              : <Activity className="h-4 w-4 text-blue-500" />}
                            <span className="text-sm">
                              <Badge variant="outline" className={gradeColour(h.oldGrade)}>{h.oldGrade}</Badge>
                              <span className="mx-1">→</span>
                              <Badge variant="outline" className={gradeColour(h.newGrade)}>{h.newGrade}</Badge>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={h.trigger === "MANUAL" ? "default" : "secondary"} className="text-xs">{h.trigger}{h.changedByName ? ` · ${h.changedByName}` : ""}</Badge></TableCell>
                        <TableCell className="text-center text-sm">{h.winRate !== null ? `${h.winRate}%` : "—"}</TableCell>
                        <TableCell className="text-center text-sm">{h.gamesWon !== null && h.gamesPlayed !== null ? `${h.gamesWon}/${h.gamesPlayed}` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{h.note || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Matches in Current Window</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentMatches.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No completed matches in the current rolling window.</TableCell></TableRow>
                    )}
                    {data.recentMatches.map(m => (
                      <TableRow key={m.matchId} data-testid={`match-row-${m.matchId}`}>
                        <TableCell className="text-sm">{m.sessionName || `Session #${m.matchId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.sessionDate ? format(new Date(m.sessionDate), "d MMM yyyy") : "—"}</TableCell>
                        <TableCell className="text-center text-sm font-medium">{m.numberOfSets > 1 ? `${m.setsWonA} - ${m.setsWonB} (sets)` : `${m.scoreA} - ${m.scoreB}`}</TableCell>
                        <TableCell className="text-center">{m.won ? <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">Win</Badge> : <Badge className="bg-red-500/20 text-red-600 border-red-500/40">Loss</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
