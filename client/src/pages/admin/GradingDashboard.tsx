import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Lock,
  Trophy, AlertTriangle, Activity, Search, Loader2, Eye, History,
} from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, ReferenceLine,
} from "recharts";

const GRADE_ORDER = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
const gradeIndex = (g: string) => GRADE_ORDER.indexOf(g);

function gradeColour(grade: string) {
  if (grade.startsWith("A")) return "bg-green-500/15 text-green-600 border-green-500/40";
  if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-600 border-blue-500/40";
  if (grade.startsWith("C")) return "bg-orange-500/15 text-orange-600 border-orange-500/40";
  return "bg-muted text-muted-foreground";
}

interface DashboardRow {
  profileId: number;
  userId: number;
  fullName: string;
  email: string;
  profilePictureUrl: string | null;
  gender: string | null;
  grade: string;
  adminLocked: boolean;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    sessionsCounted: number;
    winRate: number;
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
    createdAt: string;
  } | null;
}

interface DashboardData {
  summary: {
    totalPlayers: number;
    promotionEligible: number;
    demotionRisk: number;
    adminLocked: number;
    recentPromotions: number;
    recentDemotions: number;
    recentManualChanges: number;
    gradeDistribution: Record<string, number>;
  };
  rows: DashboardRow[];
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
    scoreA: number;
    scoreB: number;
    setsWonA: number;
    setsWonB: number;
    numberOfSets: number;
    side: "A" | "B";
    won: boolean;
  }>;
  recentSessions: Array<{ id: number; name: string; date: string }>;
}

export default function GradingDashboard() {
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const [clubId, setClubId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "promotion" | "demotion" | "locked" | "recent">("all");
  const [openProfileId, setOpenProfileId] = useState<number | null>(null);

  // Default to first admin club
  useMemo(() => {
    if (!clubId && adminClubs && adminClubs.length > 0) {
      setClubId(String(adminClubs[0].id));
    }
  }, [adminClubs, clubId]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/admin/clubs", clubId, "grading-dashboard"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clubs/${clubId}/grading-dashboard`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load grading dashboard");
      return res.json();
    },
    enabled: !!clubId,
  });

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    }
    if (filter === "promotion") rows = rows.filter(r => r.stats?.promotionEligible);
    else if (filter === "demotion") rows = rows.filter(r => r.stats?.demotionRisk);
    else if (filter === "locked") rows = rows.filter(r => r.adminLocked);
    else if (filter === "recent") rows = rows.filter(r => r.lastChange);
    return rows;
  }, [data, search, filter]);

  const distributionData = useMemo(() => {
    if (!data) return [];
    return GRADE_ORDER.map(g => ({
      grade: g,
      count: data.summary.gradeDistribution[g] || 0,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Player Grading Progress
          </h1>
          <p className="text-muted-foreground">
            Live view of every player's grading. Click a row to see their full progress, history and matches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {adminClubs && adminClubs.length > 1 && (
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger className="w-[220px]" data-testid="select-club">
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {adminClubs.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} data-testid={`select-club-option-${c.id}`}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Trophy className="h-5 w-5 text-primary" />}
              label="Players"
              value={data.summary.totalPlayers}
              testId="summary-total"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              label="Promotion Ready"
              value={data.summary.promotionEligible}
              hint="55%+ win rate, enough games"
              testId="summary-promotion"
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5 text-orange-500" />}
              label="Demotion Risk"
              value={data.summary.demotionRisk}
              hint="40% or below win rate"
              testId="summary-demotion"
            />
            <SummaryCard
              icon={<History className="h-5 w-5 text-blue-500" />}
              label="Changes Last 30 Days"
              value={data.summary.recentPromotions + data.summary.recentDemotions + data.summary.recentManualChanges}
              hint={`${data.summary.recentPromotions} up · ${data.summary.recentDemotions} down · ${data.summary.recentManualChanges} manual`}
              testId="summary-recent"
            />
          </div>

          {/* Distribution chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
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

          {/* Filters + Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-base">Player Progress Table</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-full sm:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Players</SelectItem>
                      <SelectItem value="promotion">Promotion Ready</SelectItem>
                      <SelectItem value="demotion">Demotion Risk</SelectItem>
                      <SelectItem value="recent">Recently Changed</SelectItem>
                      <SelectItem value="locked">Admin-Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-center">Win Rate (Window)</TableHead>
                      <TableHead className="text-center">Record (W-L)</TableHead>
                      <TableHead className="text-center">Sessions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Change</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r) => (
                      <TableRow
                        key={r.profileId}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setOpenProfileId(r.profileId)}
                        data-testid={`row-player-${r.profileId}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={r.profilePictureUrl || undefined} />
                              <AvatarFallback>{r.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium" data-testid={`text-name-${r.profileId}`}>{r.fullName}</div>
                              <div className="text-xs text-muted-foreground">{r.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={gradeColour(r.grade)} data-testid={`badge-grade-${r.profileId}`}>
                            {r.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {r.stats && r.stats.gamesPlayed > 0 ? (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold" data-testid={`text-winrate-${r.profileId}`}>
                                {(r.stats.winRate * 100).toFixed(0)}%
                              </div>
                              <Progress value={r.stats.winRate * 100} className="h-1.5 w-24 mx-auto" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No games</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {r.stats ? (
                            <span>
                              <span className="text-green-600 font-medium">{r.stats.gamesWon}</span>
                              <span className="text-muted-foreground"> - </span>
                              <span className="text-red-600 font-medium">{r.stats.gamesLost}</span>
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {r.stats?.sessionsCounted ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.adminLocked && (
                              <Badge variant="outline" className="bg-purple-500/15 text-purple-600 border-purple-500/40 gap-1">
                                <Lock className="h-3 w-3" /> Locked
                              </Badge>
                            )}
                            {r.stats?.promotionEligible && (
                              <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/40 gap-1">
                                <ArrowUpRight className="h-3 w-3" /> Promote
                              </Badge>
                            )}
                            {r.stats?.demotionRisk && (
                              <Badge variant="outline" className="bg-orange-500/15 text-orange-600 border-orange-500/40 gap-1">
                                <ArrowDownRight className="h-3 w-3" /> At Risk
                              </Badge>
                            )}
                            {!r.adminLocked && !r.stats?.promotionEligible && !r.stats?.demotionRisk && (
                              <span className="text-xs text-muted-foreground">Stable</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.lastChange ? (
                            <div className="flex items-center gap-2">
                              {r.lastChange.direction === "PROMOTION" ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : r.lastChange.direction === "DEMOTION" ? (
                                <TrendingDown className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Activity className="h-4 w-4 text-blue-500" />
                              )}
                              <div>
                                <div className="text-xs">
                                  {r.lastChange.oldGrade} → <span className="font-medium">{r.lastChange.newGrade}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {format(new Date(r.lastChange.createdAt), "d MMM yyyy")} · {r.lastChange.trigger}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No changes yet</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setOpenProfileId(r.profileId); }}
                            data-testid={`button-view-${r.profileId}`}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No players match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <PlayerProgressDialog
        profileId={openProfileId}
        onClose={() => setOpenProfileId(null)}
      />
    </div>
  );
}

function SummaryCard({
  icon, label, value, hint, testId,
}: { icon: React.ReactNode; label: string; value: number; hint?: string; testId?: string }) {
  return (
    <Card data-testid={testId}>
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

  // Build chart data — chronological grade timeline using grade index as Y axis
  const timelineData = useMemo(() => {
    if (!data) return [];
    const chronological = [...data.history].reverse();
    const points = chronological.map(h => ({
      date: format(new Date(h.createdAt), "d MMM"),
      gradeIdx: gradeIndex(h.newGrade),
      grade: h.newGrade,
      winRate: h.winRate ?? null,
    }));
    // Add a final "now" point
    if (data.profile.grade) {
      points.push({
        date: "Now",
        gradeIdx: gradeIndex(data.profile.grade),
        grade: data.profile.grade,
        winRate: Math.round(data.currentStats.winRate * 100),
      });
    }
    return points;
  }, [data]);

  return (
    <Dialog open={!!profileId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-progress">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={data.profile.profilePictureUrl || undefined} />
                  <AvatarFallback>{data.profile.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{data.profile.fullName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={gradeColour(data.profile.grade)}>
                      {data.profile.grade}
                    </Badge>
                    {data.profile.adminLocked && (
                      <Badge variant="outline" className="bg-purple-500/15 text-purple-600 border-purple-500/40 gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription>
                Rolling window: last {data.currentStats.rollingWindowSessions} sessions · need {data.currentStats.minGames}+ games and {data.currentStats.minSessions}+ sessions for changes
              </DialogDescription>
            </DialogHeader>

            {/* Current window stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <StatBox label="Win Rate" value={`${(data.currentStats.winRate * 100).toFixed(0)}%`} testId="stat-winrate" />
              <StatBox label="Games W-L" value={`${data.currentStats.gamesWon} - ${data.currentStats.gamesLost}`} testId="stat-record" />
              <StatBox label="Games Played" value={String(data.currentStats.gamesPlayed)} testId="stat-played" />
              <StatBox label="Sessions" value={String(data.currentStats.sessionsCounted)} testId="stat-sessions" />
            </div>

            {/* Win rate progress vs thresholds */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Demotion ≤ {(data.currentStats.demotionThreshold * 100).toFixed(0)}%</span>
                  <span className="font-semibold text-foreground">
                    Current: {(data.currentStats.winRate * 100).toFixed(0)}%
                  </span>
                  <span>Promotion ≥ {(data.currentStats.promotionThreshold * 100).toFixed(0)}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500"
                    style={{ width: `${Math.min(100, data.currentStats.winRate * 100)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-orange-500"
                    style={{ left: `${data.currentStats.demotionThreshold * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-green-500"
                    style={{ left: `${data.currentStats.promotionThreshold * 100}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.currentStats.promotionEligible && (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/40 gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Eligible for promotion
                    </Badge>
                  )}
                  {data.currentStats.demotionRisk && (
                    <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/40 gap-1">
                      <ArrowDownRight className="h-3 w-3" /> At demotion risk
                    </Badge>
                  )}
                  {!data.currentStats.promotionEligible && !data.currentStats.demotionRisk && (
                    <Badge variant="outline">Stable</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grade timeline chart */}
            {timelineData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Grade Journey</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" />
                        <YAxis
                          domain={[0, GRADE_ORDER.length - 1]}
                          ticks={GRADE_ORDER.map((_, i) => i)}
                          tickFormatter={(v) => GRADE_ORDER[v] || ""}
                        />
                        <Tooltip
                          formatter={(_value: any, _name: any, props: any) => [props.payload.grade, "Grade"]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="gradeIdx"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Grade Change History</CardTitle>
              </CardHeader>
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
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                          No grade changes recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.history.map((h) => (
                      <TableRow key={h.id} data-testid={`history-row-${h.id}`}>
                        <TableCell className="text-xs">{format(new Date(h.createdAt), "d MMM yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {h.direction === "PROMOTION" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : h.direction === "DEMOTION" ? (
                              <TrendingDown className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Activity className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="text-sm">
                              <Badge variant="outline" className={gradeColour(h.oldGrade)}>{h.oldGrade}</Badge>
                              <span className="mx-1">→</span>
                              <Badge variant="outline" className={gradeColour(h.newGrade)}>{h.newGrade}</Badge>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={h.trigger === "MANUAL" ? "default" : "secondary"} className="text-xs">
                            {h.trigger}{h.changedByName ? ` · ${h.changedByName}` : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {h.winRate !== null ? `${h.winRate}%` : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {h.gamesWon !== null && h.gamesPlayed !== null
                            ? `${h.gamesWon}/${h.gamesPlayed}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {h.note || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent matches in window */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Matches in Current Window</CardTitle>
              </CardHeader>
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
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                          No completed matches in the current rolling window.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.recentMatches.map((m) => (
                      <TableRow key={m.matchId} data-testid={`match-row-${m.matchId}`}>
                        <TableCell className="text-sm">{m.sessionName || `Session #${m.matchId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.sessionDate ? format(new Date(m.sessionDate), "d MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {m.numberOfSets > 1
                            ? `${m.setsWonA} - ${m.setsWonB} (sets)`
                            : `${m.scoreA} - ${m.scoreB}`}
                        </TableCell>
                        <TableCell className="text-center">
                          {m.won ? (
                            <Badge className="bg-green-500/20 text-green-600 border-green-500/40">Win</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-600 border-red-500/40">Loss</Badge>
                          )}
                        </TableCell>
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

function StatBox({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-3 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
