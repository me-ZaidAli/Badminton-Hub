import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ExpandableChartDialog, KpiDetailDialog } from "@/components/ExpandableChartDialog";
import {
  BarChart3, Users, TrendingUp, Target, Download, Loader2,
  Activity, Award, ArrowUpRight, ArrowDownRight, Minus,
  FileText, Filter
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const CHANNEL_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBSITE: "Website",
  WORD_OF_MOUTH: "Word of Mouth",
  LEISURE_CENTRE: "Leisure Centre",
  SAW_SESSION: "Saw a Session",
  THROUGH_COACH: "Through a Coach",
  REFERRAL: "Referral",
  OTHER: "Other",
  UNKNOWN: "Not Specified",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 50%)",
  "hsl(45, 80%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(10, 70%, 55%)",
  "hsl(130, 50%, 45%)",
  "hsl(0, 0%, 60%)",
  "hsl(60, 60%, 50%)",
];

interface AnalyticsData {
  summary: {
    totalUsers: number;
    activeUsers: number;
    activeRate: number;
    newThisMonth: number;
    newLastMonth: number;
    premiumUsers: number;
    organicRatio: number;
    membershipPlanNames: string[];
  };
  signupsPerMonth: { month: string; signups: number; growth: number }[];
  signupsByChannel: Record<string, number>;
  premiumConversionByChannel: Record<string, { total: number; premium: number; rate: number }>;
  avgTimeToPremiumByChannel: Record<string, number>;
  retentionByChannel: Record<string, { total: number; retained: number; rate: number }>;
  avgLifespanByChannel: Record<string, number>;
  referralEffectiveness: {
    totalCodes: number;
    used: number;
    approved: number;
    conversionRate: number;
    approvalRate: number;
  };
  channelQualityScores: Record<string, number>;
}

interface MonthlyReport {
  period: string;
  month: number;
  year: number;
  growthOverview: {
    newSignups: number;
    previousMonthSignups: number;
    growthRate: number;
    totalUsersToDate: number;
  };
  acquisitionBreakdown: Record<string, number>;
  premiumInsights: { newPremiumMembers: number; conversionRate: number };
  retentionInsights: { activeUsers: number; totalUsers: number; retentionRate: number };
  referralPerformance: { totalReferrals: number; approved: number; pending: number };
  recommendations: string[];
}

export default function AcquisitionAnalytics() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clubId, setClubId] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [kpiDetail, setKpiDetail] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (clubId !== "all") queryParams.set("clubId", clubId);
  if (sourceFilter !== "all") queryParams.set("source", sourceFilter);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics/acquisition", dateFrom, dateTo, clubId, sourceFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/acquisition?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const clubsQuery = useQuery<{ clubId: number; clubName: string }[]>({
    queryKey: ["/api/clubs", "acquisition-filter"],
    queryFn: async () => {
      const res = await fetch("/api/clubs", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      if (!Array.isArray(d)) return [];
      return d.map((c: any) => ({ clubId: c.id, clubName: c.name }));
    },
  });

  const now = new Date();
  const { data: monthlyReport, isLoading: reportLoading } = useQuery<MonthlyReport>({
    queryKey: ["/api/admin/analytics/monthly-report", now.getMonth(), now.getFullYear(), clubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("month", String(now.getMonth()));
      params.set("year", String(now.getFullYear()));
      if (clubId !== "all") params.set("clubId", clubId);
      const res = await fetch(
        `/api/admin/analytics/monthly-report?${params.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  async function handleExportCSV() {
    try {
      const res = await fetch("/api/admin/analytics/acquisition/csv", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "acquisition-analytics.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {}
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const channelPieData = data
    ? Object.entries(data.signupsByChannel).map(([key, value]) => ({
        name: CHANNEL_LABELS[key] || key,
        value,
      }))
    : [];

  const qualityScoreData = data
    ? Object.entries(data.channelQualityScores)
        .map(([key, score]) => ({
          channel: CHANNEL_LABELS[key] || key,
          score,
        }))
        .sort((a, b) => b.score - a.score)
    : [];

  const retentionData = data
    ? Object.entries(data.retentionByChannel)
        .map(([key, val]) => ({
          channel: CHANNEL_LABELS[key] || key,
          rate: val.rate,
          retained: val.retained,
          total: val.total,
        }))
        .sort((a, b) => b.rate - a.rate)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <PageHeader
          title="Acquisition & KPI Analytics"
          description="Comprehensive user acquisition tracking, channel performance, and growth metrics."
        />
        <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card data-testid="card-filters">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Club</label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger data-testid="select-filter-club">
                  <SelectValue placeholder="All clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {Array.isArray(clubsQuery.data) && clubsQuery.data.map((c) => (
                    <SelectItem key={c.clubId} value={String(c.clubId)}>
                      {c.clubName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Acquisition Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-filter-source">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(CHANNEL_LABELS).filter(([k]) => k !== "UNKNOWN").map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="channels" data-testid="tab-channels">Channels</TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">Retention</TabsTrigger>
          <TabsTrigger value="referrals" data-testid="tab-referrals">Referrals</TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {data && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-total-users" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("total-users")}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="value-total-users">{data.summary.totalUsers}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.summary.activeUsers} active ({data.summary.activeRate}%)
                    </p>
                  </CardContent>
                </Card>
                <Card data-testid="card-new-this-month" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("new-this-month")}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="value-new-this-month">{data.summary.newThisMonth}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {data.summary.newThisMonth > data.summary.newLastMonth ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : data.summary.newThisMonth < data.summary.newLastMonth ? (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        vs {data.summary.newLastMonth} last month
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-premium-users" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("premium-users")}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {data.summary.membershipPlanNames && data.summary.membershipPlanNames.length > 0
                        ? `${data.summary.membershipPlanNames.join(", ")} Members`
                        : "Plan Members"}
                    </CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="value-premium-users">{data.summary.premiumUsers}</div>
                    {data.summary.membershipPlanNames && data.summary.membershipPlanNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Active on {data.summary.membershipPlanNames.length === 1 ? data.summary.membershipPlanNames[0] : `${data.summary.membershipPlanNames.length} plans`}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card data-testid="card-organic-ratio" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("organic-ratio")}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Organic Ratio</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="value-organic-ratio">{data.summary.organicRatio}%</div>
                    <p className="text-xs text-muted-foreground mt-1">non-referral signups</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card data-testid="card-signups-chart">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      Monthly Signups & Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    {data.signupsPerMonth.length > 0 ? (
                      <ExpandableChartDialog
                        title="Monthly Signups & Growth"
                        expandedChart={
                          <ResponsiveContainer width="100%" height={550}>
                            <LineChart data={data.signupsPerMonth}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                              <YAxis tick={{ fontSize: 13 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: "14px" }} />
                              <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={3} name="Signups" />
                            </LineChart>
                          </ResponsiveContainer>
                        }
                      >
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={data.signupsPerMonth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} name="Signups" />
                          </LineChart>
                        </ResponsiveContainer>
                      </ExpandableChartDialog>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                        No signup data yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="card-channel-pie">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4" />
                      Signups by Channel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    {channelPieData.length > 0 ? (
                      <ExpandableChartDialog
                        title="Signups by Channel"
                        expandedChart={
                          <ResponsiveContainer width="100%" height={550}>
                            <PieChart>
                              <Pie
                                data={channelPieData}
                                cx="50%"
                                cy="45%"
                                outerRadius={180}
                                innerRadius={70}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              >
                                {channelPieData.map((_, index) => (
                                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                                formatter={(value: number, name: string) => [`${value} (${channelPieData.length > 0 ? ((value / channelPieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0) : 0}%)`, name]}
                              />
                              <Legend wrapperStyle={{ fontSize: "14px", paddingTop: "12px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        }
                      >
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={channelPieData}
                              cx="50%"
                              cy="40%"
                              outerRadius={80}
                              innerRadius={30}
                              dataKey="value"
                              label={false}
                            >
                              {channelPieData.map((_, index) => (
                                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number, name: string) => [`${value} (${channelPieData.length > 0 ? ((value / channelPieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0) : 0}%)`, name]}
                            />
                            <Legend
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </ExpandableChartDialog>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                        No channel data yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          {data && (
            <>
              <Card data-testid="card-quality-scores">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-4 w-4" />
                    Channel Quality Scores
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Weighted score: 40% Membership conversion + 30% Retention + 30% Activity
                  </p>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  {qualityScoreData.length > 0 ? (
                    <ExpandableChartDialog
                      title="Channel Quality Scores"
                      description="Weighted score: 40% Membership conversion + 30% Retention + 30% Activity"
                      expandedChart={
                        <ResponsiveContainer width="100%" height={Math.max(400, qualityScoreData.length * 55)}>
                          <BarChart data={qualityScoreData} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tick={{ fontSize: 13 }} domain={[0, 100]} />
                            <YAxis dataKey="channel" type="category" tick={{ fontSize: 13 }} width={120} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`${value}`, "Quality Score"]}
                            />
                            <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      }
                    >
                    <ResponsiveContainer width="100%" height={Math.max(200, qualityScoreData.length * 40)}>
                      <BarChart data={qualityScoreData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <YAxis dataKey="channel" type="category" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value}`, "Quality Score"]}
                        />
                        <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    </ExpandableChartDialog>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      No data available yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-conversion-table">
                <CardHeader>
                  <CardTitle className="text-base">
                    {data.summary.membershipPlanNames && data.summary.membershipPlanNames.length > 0
                      ? `${data.summary.membershipPlanNames.join(" / ")} Conversion by Channel`
                      : "Membership Conversion by Channel"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel</TableHead>
                          <TableHead className="text-right">Total Users</TableHead>
                          <TableHead className="text-right">Members</TableHead>
                          <TableHead className="text-right">Conversion Rate</TableHead>
                          <TableHead className="text-right">Avg Days to Join</TableHead>
                          <TableHead className="text-right">Avg Lifespan (days)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(data.premiumConversionByChannel).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No conversion data yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          Object.entries(data.premiumConversionByChannel).map(([ch, val]) => (
                            <TableRow key={ch} data-testid={`row-conversion-${ch}`}>
                              <TableCell className="font-medium">{CHANNEL_LABELS[ch] || ch}</TableCell>
                              <TableCell className="text-right">{val.total}</TableCell>
                              <TableCell className="text-right">{val.premium}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={val.rate > 20 ? "default" : "secondary"}>
                                  {val.rate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {data.avgTimeToPremiumByChannel[ch] ?? "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.avgLifespanByChannel[ch] ?? "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          {data && (
            <Card data-testid="card-retention-table">
              <CardHeader>
                <CardTitle className="text-base">Retention by Acquisition Channel</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Users active within 30 days, for accounts older than 90 days
                </p>
              </CardHeader>
              <CardContent className="overflow-hidden">
                {retentionData.length > 0 ? (
                  <>
                    <ExpandableChartDialog
                      title="Retention by Acquisition Channel"
                      description="Users active within 30 days, for accounts older than 90 days"
                      expandedChart={
                        <ResponsiveContainer width="100%" height={500}>
                          <BarChart data={retentionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="channel" tick={{ fontSize: 13, angle: -20, textAnchor: "end" }} height={60} interval={0} />
                            <YAxis tick={{ fontSize: 13 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`${value}%`, "Retention"]}
                            />
                            <Bar dataKey="rate" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      }
                    >
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={retentionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="channel" tick={{ fontSize: 9, angle: -30, textAnchor: "end" }} height={50} interval={0} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value}%`, "Retention"]}
                        />
                        <Bar dataKey="rate" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    </ExpandableChartDialog>
                    <div className="mt-4 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Channel</TableHead>
                            <TableHead className="text-right">Eligible Users</TableHead>
                            <TableHead className="text-right">Still Active</TableHead>
                            <TableHead className="text-right">Retention Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {retentionData.map((r) => (
                            <TableRow key={r.channel} data-testid={`row-retention-${r.channel}`}>
                              <TableCell className="font-medium">{r.channel}</TableCell>
                              <TableCell className="text-right">{r.total}</TableCell>
                              <TableCell className="text-right">{r.retained}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={r.rate > 50 ? "default" : "secondary"}>
                                  {r.rate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No retention data available yet (requires users older than 90 days)
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          {data && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card data-testid="card-ref-total" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("ref-total")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.referralEffectiveness.totalCodes}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-ref-used" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("ref-used")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Codes Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.referralEffectiveness.used}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-ref-approved" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("ref-approved")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.referralEffectiveness.approved}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-ref-conversion" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("ref-conversion")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Usage Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.referralEffectiveness.conversionRate}%</div>
                </CardContent>
              </Card>
              <Card data-testid="card-ref-approval-rate" className="cursor-pointer hover-elevate" onClick={() => setKpiDetail("ref-approval-rate")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Approval Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.referralEffectiveness.approvalRate}%</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          {reportLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : monthlyReport ? (
            <div className="space-y-6">
              <Card data-testid="card-report-header">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Monthly Summary: {monthlyReport.period}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">New Signups</p>
                      <p className="text-2xl font-bold" data-testid="report-new-signups">
                        {monthlyReport.growthOverview.newSignups}
                      </p>
                      <div className="flex items-center gap-1">
                        {monthlyReport.growthOverview.growthRate > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                        ) : monthlyReport.growthOverview.growthRate < 0 ? (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {monthlyReport.growthOverview.growthRate}% vs previous month
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Users to Date</p>
                      <p className="text-2xl font-bold">{monthlyReport.growthOverview.totalUsersToDate}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{monthlyReport.retentionInsights.activeUsers}</p>
                      <p className="text-xs text-muted-foreground">
                        {monthlyReport.retentionInsights.retentionRate}% retention
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Membership Conversions</p>
                      <p className="text-2xl font-bold">{monthlyReport.premiumInsights.newPremiumMembers}</p>
                      <p className="text-xs text-muted-foreground">
                        {monthlyReport.premiumInsights.conversionRate}% of new users
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Acquisition Breakdown</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(monthlyReport.acquisitionBreakdown).map(([ch, count]) => (
                        <Badge key={ch} variant="outline" data-testid={`report-channel-${ch}`}>
                          {CHANNEL_LABELS[ch] || ch}: {count}
                        </Badge>
                      ))}
                      {Object.keys(monthlyReport.acquisitionBreakdown).length === 0 && (
                        <span className="text-sm text-muted-foreground">No signups this month</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Referral Performance</h4>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>Total: {monthlyReport.referralPerformance.totalReferrals}</span>
                      <span>Approved: {monthlyReport.referralPerformance.approved}</span>
                      <span>Pending: {monthlyReport.referralPerformance.pending}</span>
                    </div>
                  </div>

                  {monthlyReport.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {monthlyReport.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <TrendingUp className="h-3 w-3 mt-1 shrink-0 text-primary" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No report data available
            </div>
          )}
        </TabsContent>
      </Tabs>

      {data && (
        <>
          <KpiDetailDialog
            open={kpiDetail === "total-users"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Total Users Breakdown"
            description="User distribution across acquisition channels"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.signupsByChannel).map(([ch, count]) => (
                  <TableRow key={ch}>
                    <TableCell>{CHANNEL_LABELS[ch] || ch}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right">{data.summary.totalUsers > 0 ? ((count / data.summary.totalUsers) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "new-this-month"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Monthly Signups Trend"
            description="Signup counts and month-over-month growth"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.signupsPerMonth.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{row.month}</TableCell>
                    <TableCell className="text-right">{row.signups}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.growth > 0 ? "default" : row.growth < 0 ? "destructive" : "secondary"}>
                        {row.growth > 0 ? "+" : ""}{row.growth}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "premium-users"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Membership Conversion by Channel"
            description="Breakdown of membership conversions across acquisition channels"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.premiumConversionByChannel).map(([ch, val]) => (
                  <TableRow key={ch}>
                    <TableCell>{CHANNEL_LABELS[ch] || ch}</TableCell>
                    <TableCell className="text-right">{val.total}</TableCell>
                    <TableCell className="text-right">{val.premium}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={val.rate > 20 ? "default" : "secondary"}>
                        {val.rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "organic-ratio"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Organic vs Referral Breakdown"
            description="Channel breakdown showing organic (non-referral) and referral sources"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Organic?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.signupsByChannel).map(([ch, count]) => (
                  <TableRow key={ch}>
                    <TableCell>{CHANNEL_LABELS[ch] || ch}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right">{data.summary.totalUsers > 0 ? ((count / data.summary.totalUsers) * 100).toFixed(1) : 0}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={ch !== "REFERRAL" ? "default" : "secondary"}>
                        {ch !== "REFERRAL" ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "ref-total"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Total Codes Generated"
            description="The total number of unique referral codes that have been generated by members. Each member can create referral codes to invite new users to join."
          >
            <p className="text-sm text-muted-foreground">Current total: <span className="font-semibold text-foreground">{data.referralEffectiveness.totalCodes}</span> codes generated across all members.</p>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "ref-used"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Codes Used"
            description="The number of referral codes that have been redeemed by new users during signup. This shows how many invitations have been acted upon."
          >
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{data.referralEffectiveness.used}</span> out of <span className="font-semibold text-foreground">{data.referralEffectiveness.totalCodes}</span> codes have been used by new signups.</p>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "ref-approved"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Approved Referrals"
            description="The number of referred users who have been approved by an admin. Approval confirms the referral is valid and the new member meets club requirements."
          >
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{data.referralEffectiveness.approved}</span> referrals have been reviewed and approved by administrators.</p>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "ref-conversion"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Usage Rate"
            description="The percentage of generated referral codes that have actually been used by new users. A higher usage rate indicates referrers are effectively sharing their codes."
          >
            <p className="text-sm text-muted-foreground">Usage rate: <span className="font-semibold text-foreground">{data.referralEffectiveness.conversionRate}%</span> ({data.referralEffectiveness.used} used out of {data.referralEffectiveness.totalCodes} generated).</p>
          </KpiDetailDialog>

          <KpiDetailDialog
            open={kpiDetail === "ref-approval-rate"}
            onOpenChange={(open) => !open && setKpiDetail(null)}
            title="Approval Rate"
            description="The percentage of used referral codes that have been approved. This measures the quality of referred users and how many pass the approval process."
          >
            <p className="text-sm text-muted-foreground">Approval rate: <span className="font-semibold text-foreground">{data.referralEffectiveness.approvalRate}%</span> ({data.referralEffectiveness.approved} approved out of {data.referralEffectiveness.used} used).</p>
          </KpiDetailDialog>
        </>
      )}
    </div>
  );
}
