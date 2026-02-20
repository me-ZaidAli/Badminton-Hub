import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import {
  Calendar, Users, UserCheck, BarChart3, TrendingUp, UserX,
  Loader2, ArrowUpRight, ArrowDownRight, Filter, Search,
  ChevronLeft, ChevronRight, Send, Eye, StickyNote, X
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 50%)",
  "hsl(45, 80%, 50%)",
  "hsl(280, 60%, 55%)",
];

interface AttendanceData {
  kpis: {
    totalSessions: number;
    totalAttendances: number;
    uniqueMembers: number;
    avgAttendance: number;
    growthPercent: number;
    noShowRate: number;
    noShowCount: number;
    previousPeriodAttendances: number;
  };
  topMembers: {
    profileId: number;
    name: string;
    totalAttendances: number;
    attendanceRate: number;
  }[];
  distribution: {
    bucket: string;
    count: number;
  }[];
  overTime: {
    date: string;
    attendances: number;
    sessions: number;
    uniqueMembers: number;
  }[];
  sessionPerformance: {
    type: string;
    avgAttendance: number;
    fillRate: number;
    repeatRate: number;
    firstTimerRate: number;
    totalSessions: number;
  }[];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPresetDates(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { dateFrom: formatDate(from), dateTo: formatDate(to) };
}

export default function AttendanceAnalytics() {
  const { toast } = useToast();
  const [datePreset, setDatePreset] = useState("30");
  const [dateFrom, setDateFrom] = useState(() => getPresetDates(30).dateFrom);
  const [dateTo, setDateTo] = useState(() => getPresetDates(30).dateTo);
  const [clubId, setClubId] = useState("all");
  const [sessionType, setSessionType] = useState("ALL");
  const [membershipStatus, setMembershipStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState("overview");

  const [topCount, setTopCount] = useState<10 | 20>(10);
  const [topSortBy, setTopSortBy] = useState<"total" | "rate">("total");
  const [showSessions, setShowSessions] = useState(false);
  const [showUniqueMembers, setShowUniqueMembers] = useState(false);

  const [kpiModal, setKpiModal] = useState<string | null>(null);
  const [kpiSearch, setKpiSearch] = useState("");
  const [kpiPage, setKpiPage] = useState(0);

  const [memberModal, setMemberModal] = useState<number | null>(null);
  const [messageModal, setMessageModal] = useState<{ userId: number; name: string } | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [noteModal, setNoteModal] = useState<{ userId: number; name: string } | null>(null);
  const [noteText, setNoteText] = useState("");

  const [distBucket, setDistBucket] = useState<string | null>(null);
  const [distSearch, setDistSearch] = useState("");
  const [distPage, setDistPage] = useState(0);

  const [dateDetailModal, setDateDetailModal] = useState<string | null>(null);
  const [dateSearch, setDateSearch] = useState("");
  const [datePage, setDatePage] = useState(0);

  const [sessionTypeModal, setSessionTypeModal] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionPage, setSessionPage] = useState(0);

  function applyPreset(days: string) {
    setDatePreset(days);
    if (days !== "custom") {
      const { dateFrom: f, dateTo: t } = getPresetDates(Number(days));
      setDateFrom(f);
      setDateTo(t);
    }
  }

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (clubId !== "all") queryParams.set("clubId", clubId);
  if (sessionType !== "ALL") queryParams.set("sessionType", sessionType);
  if (membershipStatus !== "ALL") queryParams.set("membershipStatus", membershipStatus);

  const { data, isLoading } = useQuery<AttendanceData>({
    queryKey: ["/api/admin/attendance-analytics", dateFrom, dateTo, clubId, sessionType, membershipStatus],
    queryFn: async () => {
      const res = await fetch(`/api/admin/attendance-analytics?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch attendance analytics");
      return res.json();
    },
  });

  const clubsQuery = useQuery<{ clubId: number; clubName: string }[]>({
    queryKey: ["/api/clubs", "attendance-filter"],
    queryFn: async () => {
      const res = await fetch("/api/clubs", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      if (!Array.isArray(d)) return [];
      return d.map((c: any) => ({ clubId: c.id, clubName: c.name }));
    },
  });

  const kpiDetailQuery = useQuery<any[]>({
    queryKey: ["/api/admin/attendance-analytics/kpi-detail", kpiModal, dateFrom, dateTo, clubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (clubId !== "all") params.set("clubId", clubId);
      const res = await fetch(`/api/admin/attendance-analytics/kpi-detail/${kpiModal}?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!kpiModal,
  });

  const memberDetailQuery = useQuery<any>({
    queryKey: ["/api/admin/attendance-analytics/member", memberModal],
    queryFn: async () => {
      const res = await fetch(`/api/admin/attendance-analytics/member/${memberModal}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!memberModal,
  });

  const distDetailQuery = useQuery<any[]>({
    queryKey: ["/api/admin/attendance-analytics/distribution", distBucket, dateFrom, dateTo, clubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (clubId !== "all") params.set("clubId", clubId);
      const res = await fetch(`/api/admin/attendance-analytics/distribution/${encodeURIComponent(distBucket!)}?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!distBucket,
  });

  const dateDetailQuery = useQuery<any[]>({
    queryKey: ["/api/admin/attendance-analytics/date-detail", dateDetailModal],
    queryFn: async () => {
      const res = await fetch(`/api/admin/attendance-analytics/date-detail/${dateDetailModal}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!dateDetailModal,
  });

  const sessionTypeDetailQuery = useQuery<any>({
    queryKey: ["/api/admin/attendance-analytics/session-type", sessionTypeModal, dateFrom, dateTo, clubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (clubId !== "all") params.set("clubId", clubId);
      const res = await fetch(`/api/admin/attendance-analytics/session-type/${sessionTypeModal}?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!sessionTypeModal,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, subject, body }: { userId: number; subject: string; body: string }) => {
      await apiRequest("POST", `/api/admin/inactive-members/${userId}/message`, {
        subject,
        body,
        clubId: clubId !== "all" ? Number(clubId) : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Message sent successfully" });
      setMessageModal(null);
      setMessageSubject("");
      setMessageBody("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ userId, note }: { userId: number; note: string }) => {
      await apiRequest("POST", "/api/admin/audit-log", {
        action: "ADD_NOTE",
        targetUserId: userId,
        details: note,
      });
    },
    onSuccess: () => {
      toast({ title: "Note added successfully" });
      setNoteModal(null);
      setNoteText("");
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  function handleViewProfile(profileId: number) {
    apiRequest("POST", "/api/admin/audit-log", {
      action: "VIEW_PROFILE",
      targetUserId: profileId,
      details: "Viewed from attendance analytics",
    }).catch(() => {});
    window.open(`/admin/players/${profileId}`, "_blank");
  }

  function paginate<T>(items: T[], search: string, page: number, searchFn: (item: T, q: string) => boolean) {
    const filtered = search ? items.filter((i) => searchFn(i, search.toLowerCase())) : items;
    const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
    const safePage = Math.min(page, totalPages - 1);
    return {
      items: filtered.slice(safePage * 10, safePage * 10 + 10),
      totalPages,
      currentPage: safePage,
      total: filtered.length,
    };
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards = data
    ? [
        { key: "totalSessions", label: "Total Sessions Held", value: data.kpis.totalSessions, icon: Calendar },
        { key: "totalAttendances", label: "Total Attendances", value: data.kpis.totalAttendances, icon: Users },
        { key: "uniqueMembers", label: "Unique Attending Members", value: data.kpis.uniqueMembers, icon: UserCheck },
        { key: "avgAttendance", label: "Avg Attendance Per Session", value: data.kpis.avgAttendance.toFixed(1), icon: BarChart3 },
        {
          key: "attendanceGrowth",
          label: "Attendance Growth",
          value: `${data.kpis.growthPercent > 0 ? "+" : ""}${data.kpis.growthPercent.toFixed(1)}%`,
          icon: TrendingUp,
          growth: data.kpis.growthPercent,
        },
        { key: "noShowRate", label: "No-Show Rate", value: `${data.kpis.noShowRate.toFixed(1)}%`, icon: UserX },
      ]
    : [];

  const sortedTopMembers = data
    ? [...data.topMembers]
        .sort((a, b) => (topSortBy === "total" ? b.totalAttendances - a.totalAttendances : b.attendanceRate - a.attendanceRate))
        .slice(0, topCount)
    : [];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Analytics"
        description="Comprehensive attendance tracking, member engagement, and session performance metrics."
      />

      <Card data-testid="card-filters">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[
              { label: "Last 7 days", value: "7" },
              { label: "Last 30 days", value: "30" },
              { label: "Last 60 days", value: "60" },
              { label: "Last 90 days", value: "90" },
              { label: "Custom", value: "custom" },
            ].map((p) => (
              <Button
                key={p.value}
                variant={datePreset === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(p.value)}
                data-testid={`button-preset-${p.value}`}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {datePreset === "custom" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Club</label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger data-testid="select-filter-club">
                  <SelectValue placeholder="All clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {Array.isArray(clubsQuery.data) &&
                    clubsQuery.data.map((c) => (
                      <SelectItem key={c.clubId} value={String(c.clubId)}>
                        {c.clubName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Session Type</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger data-testid="select-filter-session-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Membership Status</label>
              <Select value={membershipStatus} onValueChange={setMembershipStatus}>
                <SelectTrigger data-testid="select-filter-membership">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-attendance">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="high-attendance" data-testid="tab-high-attendance">High Attendance</TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">Distribution</TabsTrigger>
          <TabsTrigger value="over-time" data-testid="tab-over-time">Over Time</TabsTrigger>
          <TabsTrigger value="session-performance" data-testid="tab-session-performance">Session Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {data && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kpiCards.map((kpi) => (
                <Card
                  key={kpi.key}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setKpiModal(kpi.key);
                    setKpiSearch("");
                    setKpiPage(0);
                  }}
                  data-testid={`card-kpi-${kpi.key}`}
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid={`value-kpi-${kpi.key}`}>
                      {kpi.value}
                    </div>
                    {kpi.key === "attendanceGrowth" && (
                      <div className="flex items-center gap-1 mt-1">
                        {(kpi.growth ?? 0) > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                        ) : (kpi.growth ?? 0) < 0 ? (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        ) : null}
                        <span className="text-xs text-muted-foreground">vs previous period</span>
                      </div>
                    )}
                    {kpi.key === "noShowRate" && (
                      <p className="text-xs text-muted-foreground mt-1">of total bookings</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* High Attendance Tab */}
        <TabsContent value="high-attendance" className="space-y-6">
          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={topCount === 10 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopCount(10)}
                  data-testid="button-top-10"
                >
                  Top 10
                </Button>
                <Button
                  variant={topCount === 20 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopCount(20)}
                  data-testid="button-top-20"
                >
                  Top 20
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  variant={topSortBy === "total" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopSortBy("total")}
                  data-testid="button-sort-total"
                >
                  By Total Attendances
                </Button>
                <Button
                  variant={topSortBy === "rate" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopSortBy("rate")}
                  data-testid="button-sort-rate"
                >
                  By Attendance Rate
                </Button>
              </div>
              <Card data-testid="card-top-members-chart">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    Top Members by {topSortBy === "total" ? "Attendances" : "Attendance Rate"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sortedTopMembers.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(280, sortedTopMembers.length * 32)}>
                      <BarChart data={sortedTopMembers} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar
                          dataKey={topSortBy === "total" ? "totalAttendances" : "attendanceRate"}
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry?.profileId) {
                              setMemberModal(entry.profileId);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      No attendance data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          {data && (
            <Card data-testid="card-distribution-chart">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Attendance Frequency Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">Members grouped by attendance frequency</p>
              </CardHeader>
              <CardContent>
                {data.distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}`, "Members"]} />
                      <Bar
                        dataKey="count"
                        fill="hsl(220, 70%, 55%)"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry?.bucket) {
                            setDistBucket(entry.bucket);
                            setDistSearch("");
                            setDistPage(0);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    No distribution data yet
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Over Time Tab */}
        <TabsContent value="over-time" className="space-y-6">
          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={showSessions ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowSessions(!showSessions)}
                  data-testid="button-toggle-sessions"
                  className={showSessions ? "toggle-elevate toggle-elevated" : "toggle-elevate"}
                >
                  Show Sessions Held
                </Button>
                <Button
                  variant={showUniqueMembers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUniqueMembers(!showUniqueMembers)}
                  data-testid="button-toggle-unique"
                  className={showUniqueMembers ? "toggle-elevate toggle-elevated" : "toggle-elevate"}
                >
                  Show Unique Members
                </Button>
              </div>
              <Card data-testid="card-over-time-chart">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Attendance Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.overTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={data.overTime}
                        onClick={(e: any) => {
                          if (e?.activeLabel) {
                            setDateDetailModal(e.activeLabel);
                            setDateSearch("");
                            setDatePage(0);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Line type="monotone" dataKey="attendances" stroke="hsl(var(--primary))" strokeWidth={2} name="Attendances" />
                        {showSessions && (
                          <Line type="monotone" dataKey="sessions" stroke="hsl(220, 70%, 55%)" strokeWidth={2} name="Sessions Held" />
                        )}
                        {showUniqueMembers && (
                          <Line type="monotone" dataKey="uniqueMembers" stroke="hsl(160, 60%, 45%)" strokeWidth={2} name="Unique Members" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      No time series data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Session Performance Tab */}
        <TabsContent value="session-performance" className="space-y-6">
          {data && (
            <div className="grid gap-4 md:grid-cols-3">
              {data.sessionPerformance.map((sp) => (
                <Card
                  key={sp.type}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setSessionTypeModal(sp.type);
                    setSessionSearch("");
                    setSessionPage(0);
                  }}
                  data-testid={`card-session-${sp.type}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                      {sp.type}
                      <Badge variant="secondary">{sp.totalSessions} sessions</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Attendance</span>
                      <span className="font-medium" data-testid={`value-avg-${sp.type}`}>{sp.avgAttendance.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fill Rate</span>
                      <span className="font-medium">{sp.fillRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repeat Rate</span>
                      <span className="font-medium">{sp.repeatRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">First-Timer Rate</span>
                      <span className="font-medium">{sp.firstTimerRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {data.sessionPerformance.length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">No session performance data yet</div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* KPI Detail Modal */}
      <Dialog open={!!kpiModal} onOpenChange={(open) => !open && setKpiModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="modal-title-kpi">
              {kpiCards.find((k) => k.key === kpiModal)?.label ?? "KPI Detail"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={kpiSearch}
              onChange={(e) => { setKpiSearch(e.target.value); setKpiPage(0); }}
              className="pl-9"
              data-testid="input-kpi-search"
            />
          </div>
          {kpiDetailQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            (() => {
              const items = Array.isArray(kpiDetailQuery.data) ? kpiDetailQuery.data : [];
              const p = paginate(items, kpiSearch, kpiPage, (item: any, q: string) =>
                JSON.stringify(item).toLowerCase().includes(q)
              );
              return (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {items.length > 0 && Object.keys(items[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.items.length > 0 ? p.items.map((row: any, i: number) => (
                          <TableRow key={i} data-testid={`row-kpi-${i}`}>
                            {Object.values(row).map((val: any, j: number) => (
                              <TableCell key={j}>{String(val ?? "")}</TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={99} className="text-center py-8 text-muted-foreground">No data</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {p.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{p.total} results</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={p.currentPage === 0} onClick={() => setKpiPage(p.currentPage - 1)} data-testid="button-kpi-prev">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{p.currentPage + 1} / {p.totalPages}</span>
                        <Button size="sm" variant="outline" disabled={p.currentPage >= p.totalPages - 1} onClick={() => setKpiPage(p.currentPage + 1)} data-testid="button-kpi-next">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      {/* Member Detail Modal */}
      <Dialog open={!!memberModal} onOpenChange={(open) => !open && setMemberModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="modal-title-member">Member Details</DialogTitle>
          </DialogHeader>
          {memberDetailQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : memberDetailQuery.data ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold" data-testid="text-member-name">{memberDetailQuery.data.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Attendances</span>
                  <p className="font-medium" data-testid="value-member-attendances">{memberDetailQuery.data.totalAttendances}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Bookings</span>
                  <p className="font-medium">{memberDetailQuery.data.totalBookings}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Attendance Rate</span>
                  <p className="font-medium">{memberDetailQuery.data.attendanceRate?.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">No-Show Count</span>
                  <p className="font-medium">{memberDetailQuery.data.noShowCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Most Frequent Type</span>
                  <p className="font-medium">{memberDetailQuery.data.mostFrequentType ?? "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days Since Last</span>
                  <p className="font-medium">{memberDetailQuery.data.daysSinceLastAttendance ?? "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">First Attendance</span>
                  <p className="font-medium">{memberDetailQuery.data.firstAttendance ?? "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Attendance</span>
                  <p className="font-medium">{memberDetailQuery.data.lastAttendance ?? "N/A"}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Engagement Score</span>
                  <span className="text-sm font-medium" data-testid="value-engagement-score">
                    {memberDetailQuery.data.engagementScore ?? 0}/100
                  </span>
                </div>
                <Progress
                  value={memberDetailQuery.data.engagementScore ?? 0}
                  className={`h-2 ${
                    (memberDetailQuery.data.engagementScore ?? 0) >= 70
                      ? "[&>div]:bg-green-500"
                      : (memberDetailQuery.data.engagementScore ?? 0) >= 40
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-red-500"
                  }`}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMessageModal({ userId: memberModal!, name: memberDetailQuery.data.name });
                  }}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send Message
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewProfile(memberModal!)}
                  data-testid="button-view-profile"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNoteModal({ userId: memberModal!, name: memberDetailQuery.data.name });
                  }}
                  data-testid="button-add-note"
                >
                  <StickyNote className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No member data found</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={!!messageModal} onOpenChange={(open) => !open && setMessageModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="modal-title-message">Send Message to {messageModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Subject</label>
              <Input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Message subject"
                data-testid="input-message-subject"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Body</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write your message..."
                data-testid="input-message-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageModal(null)} data-testid="button-cancel-message">Cancel</Button>
            <Button
              onClick={() => {
                if (messageModal) {
                  sendMessageMutation.mutate({ userId: messageModal.userId, subject: messageSubject, body: messageBody });
                }
              }}
              disabled={!messageSubject.trim() || !messageBody.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message-confirm"
            >
              {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={!!noteModal} onOpenChange={(open) => !open && setNoteModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="modal-title-note">Add Note for {noteModal?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Note</label>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note..."
              data-testid="input-note-text"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModal(null)} data-testid="button-cancel-note">Cancel</Button>
            <Button
              onClick={() => {
                if (noteModal) {
                  addNoteMutation.mutate({ userId: noteModal.userId, note: noteText });
                }
              }}
              disabled={!noteText.trim() || addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <StickyNote className="h-4 w-4 mr-1" />}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution Detail Modal */}
      <Dialog open={!!distBucket} onOpenChange={(open) => !open && setDistBucket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="modal-title-distribution">Members with {distBucket} attendances</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={distSearch}
              onChange={(e) => { setDistSearch(e.target.value); setDistPage(0); }}
              className="pl-9"
              data-testid="input-dist-search"
            />
          </div>
          {distDetailQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            (() => {
              const items = Array.isArray(distDetailQuery.data) ? distDetailQuery.data : [];
              const p = paginate(items, distSearch, distPage, (item: any, q: string) =>
                (item.name || "").toLowerCase().includes(q)
              );
              return (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Attendances</TableHead>
                          <TableHead>Last Attended</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Club</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.items.length > 0 ? p.items.map((row: any, i: number) => (
                          <TableRow key={i} data-testid={`row-dist-${i}`}>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell className="text-right">{row.attendances}</TableCell>
                            <TableCell>{row.lastAttended ?? "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={row.membershipStatus === "ACTIVE" ? "default" : "secondary"}>
                                {row.membershipStatus ?? "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.club ?? "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleViewProfile(row.profileId)} data-testid={`button-view-${row.profileId}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setMessageModal({ userId: row.profileId, name: row.name })} data-testid={`button-msg-${row.profileId}`}>
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No members found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {p.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{p.total} members</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={p.currentPage === 0} onClick={() => setDistPage(p.currentPage - 1)} data-testid="button-dist-prev">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{p.currentPage + 1} / {p.totalPages}</span>
                        <Button size="sm" variant="outline" disabled={p.currentPage >= p.totalPages - 1} onClick={() => setDistPage(p.currentPage + 1)} data-testid="button-dist-next">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      {/* Date Detail Modal */}
      <Dialog open={!!dateDetailModal} onOpenChange={(open) => !open && setDateDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="modal-title-date">Sessions on {dateDetailModal}</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={dateSearch}
              onChange={(e) => { setDateSearch(e.target.value); setDatePage(0); }}
              className="pl-9"
              data-testid="input-date-search"
            />
          </div>
          {dateDetailQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            (() => {
              const items = Array.isArray(dateDetailQuery.data) ? dateDetailQuery.data : [];
              const p = paginate(items, dateSearch, datePage, (item: any, q: string) =>
                JSON.stringify(item).toLowerCase().includes(q)
              );
              return (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {items.length > 0 && Object.keys(items[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.items.length > 0 ? p.items.map((row: any, i: number) => (
                          <TableRow key={i} data-testid={`row-date-${i}`}>
                            {Object.values(row).map((val: any, j: number) => (
                              <TableCell key={j}>{String(val ?? "")}</TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={99} className="text-center py-8 text-muted-foreground">No sessions found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {p.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{p.total} results</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={p.currentPage === 0} onClick={() => setDatePage(p.currentPage - 1)} data-testid="button-date-prev">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{p.currentPage + 1} / {p.totalPages}</span>
                        <Button size="sm" variant="outline" disabled={p.currentPage >= p.totalPages - 1} onClick={() => setDatePage(p.currentPage + 1)} data-testid="button-date-next">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      {/* Session Type Detail Modal */}
      <Dialog open={!!sessionTypeModal} onOpenChange={(open) => !open && setSessionTypeModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="modal-title-session-type">{sessionTypeModal} Session Details</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={sessionSearch}
              onChange={(e) => { setSessionSearch(e.target.value); setSessionPage(0); }}
              className="pl-9"
              data-testid="input-session-search"
            />
          </div>
          {sessionTypeDetailQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            (() => {
              const raw = sessionTypeDetailQuery.data;
              const items = Array.isArray(raw) ? raw : raw?.sessions ? raw.sessions : [];
              const p = paginate(items, sessionSearch, sessionPage, (item: any, q: string) =>
                JSON.stringify(item).toLowerCase().includes(q)
              );
              return (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {items.length > 0 && Object.keys(items[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.items.length > 0 ? p.items.map((row: any, i: number) => (
                          <TableRow key={i} data-testid={`row-session-${i}`}>
                            {Object.values(row).map((val: any, j: number) => (
                              <TableCell key={j}>{String(val ?? "")}</TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={99} className="text-center py-8 text-muted-foreground">No session data</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {p.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{p.total} results</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={p.currentPage === 0} onClick={() => setSessionPage(p.currentPage - 1)} data-testid="button-session-prev">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{p.currentPage + 1} / {p.totalPages}</span>
                        <Button size="sm" variant="outline" disabled={p.currentPage >= p.totalPages - 1} onClick={() => setSessionPage(p.currentPage + 1)} data-testid="button-session-next">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
