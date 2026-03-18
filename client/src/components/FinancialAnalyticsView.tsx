import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Percent,
  Building2,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format } from "date-fns";

interface FinancialEntry {
  signupId: number;
  sessionId: number;
  playerId: number;
  fee: number;
  paymentStatus: "PAID" | "UNPAID" | "PENDING";
  paymentMethod?: "CARD" | "BANK_TRANSFER" | "NONE" | null;
  signupStatus?: "CONFIRMED" | "WAITING" | "CANCELLED" | null;
  attendanceStatus: string;
  signupTime: string;
  sessionTitle: string;
  sessionDate: string;
  sessionType: string;
  matchMode: string;
  sessionFee: number;
  clubId: number;
  clubName: string;
  playerName: string;
  playerEmail: string;
  playerUserId: number;
  membershipStatus: string | null;
  membershipPlanName: string | null;
  membershipSessionFee: number | null;
}

interface DashboardData {
  sessionIncome: number;
  sessionPaid: number;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  membershipTotalRevenue: number;
  membershipPaid: number;
  membershipUnpaid: number;
  membershipActiveCount: number;
}

interface FinancialAnalyticsViewProps {
  filteredData: FinancialEntry[];
  dashboardData: DashboardData | undefined;
  donationTotal?: number;
}

function formatPounds(pence: number): string {
  return (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CHART_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(47, 96%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
  "hsl(25, 95%, 53%)",
  "hsl(339, 82%, 51%)",
];

const PIE_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(47, 96%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
];

function AnimatedNumber({ value, prefix = "" }: { value: string; prefix?: string }) {
  return (
    <span className="tabular-nums font-bold text-2xl md:text-3xl">
      {prefix}{value}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground" style={{ color: entry.color }}>
          {entry.name}: £{formatPounds(entry.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{entry.name}</p>
      <p className="text-muted-foreground">£{formatPounds(entry.value)}</p>
      <p className="text-muted-foreground">{((entry.payload.percent || 0) * 100).toFixed(1)}%</p>
    </div>
  );
}

export default function FinancialAnalyticsView({ filteredData, dashboardData, donationTotal = 0 }: FinancialAnalyticsViewProps) {
  const [revenueLayers, setRevenueLayers] = useState({
    sessions: true,
    memberships: true,
    total: true,
  });
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const totalRevenue = useMemo(() => filteredData.reduce((s, e) => s + (e.fee || 0), 0), [filteredData]);
  const paidTotal = useMemo(() => filteredData.filter(e => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0), [filteredData]);
  const netRevenue = dashboardData?.netRevenue ?? totalRevenue;
  const collectionRate = totalRevenue > 0 ? ((paidTotal / totalRevenue) * 100).toFixed(1) : "0.0";

  const revenueTrend = useMemo(() => {
    const monthMap: Record<string, { month: string; sessions: number; memberships: number; total: number; sortKey: string }> = {};
    filteredData.forEach(entry => {
      const d = new Date(entry.sessionDate);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      if (!monthMap[key]) monthMap[key] = { month: label, sessions: 0, memberships: 0, total: 0, sortKey: key };
      monthMap[key].sessions += entry.fee || 0;
      monthMap[key].total += entry.fee || 0;
    });

    if (dashboardData && dashboardData.membershipPaid > 0) {
      const now = new Date();
      const key = format(now, "yyyy-MM");
      const label = format(now, "MMM yy");
      if (!monthMap[key]) monthMap[key] = { month: label, sessions: 0, memberships: 0, total: 0, sortKey: key };
      monthMap[key].memberships += dashboardData.membershipPaid;
      monthMap[key].total += dashboardData.membershipPaid;
    }

    return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData, dashboardData]);

  const revenueDistribution = useMemo(() => {
    const sessionRev = dashboardData?.sessionIncome ?? totalRevenue;
    const membershipRev = dashboardData?.membershipTotalRevenue ?? 0;
    const items: { name: string; value: number; percent: number }[] = [];
    const total = sessionRev + membershipRev + donationTotal;
    if (total === 0) return [];
    if (sessionRev > 0) items.push({ name: "Sessions", value: sessionRev, percent: sessionRev / total });
    if (membershipRev > 0) items.push({ name: "Memberships", value: membershipRev, percent: membershipRev / total });
    if (donationTotal > 0) items.push({ name: "Donations", value: donationTotal, percent: donationTotal / total });
    return items;
  }, [totalRevenue, dashboardData, donationTotal]);

  const clubRevenue = useMemo(() => {
    const clubs: Record<number, { name: string; revenue: number; collected: number; outstanding: number }> = {};
    filteredData.forEach(entry => {
      if (!clubs[entry.clubId]) clubs[entry.clubId] = { name: entry.clubName, revenue: 0, collected: 0, outstanding: 0 };
      clubs[entry.clubId].revenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") clubs[entry.clubId].collected += entry.fee || 0;
      else clubs[entry.clubId].outstanding += entry.fee || 0;
    });
    return Object.values(clubs).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const breakdownTable = useMemo(() => {
    const rows: { source: string; totalRevenue: number; collected: number; outstanding: number; rate: number }[] = [];

    const sessionsByType: Record<string, { revenue: number; collected: number }> = {};
    filteredData.forEach(entry => {
      const t = entry.sessionType || "OPEN";
      if (!sessionsByType[t]) sessionsByType[t] = { revenue: 0, collected: 0 };
      sessionsByType[t].revenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") sessionsByType[t].collected += entry.fee || 0;
    });
    Object.entries(sessionsByType).forEach(([type, data]) => {
      rows.push({
        source: `Sessions (${type === "OPEN" ? "Open" : type === "JUNIORS_ONLY" ? "Juniors" : type})`,
        totalRevenue: data.revenue,
        collected: data.collected,
        outstanding: data.revenue - data.collected,
        rate: data.revenue > 0 ? (data.collected / data.revenue) * 100 : 0,
      });
    });

    if (dashboardData && dashboardData.membershipTotalRevenue > 0) {
      rows.push({
        source: "Memberships",
        totalRevenue: dashboardData.membershipTotalRevenue,
        collected: dashboardData.membershipPaid,
        outstanding: dashboardData.membershipUnpaid,
        rate: dashboardData.membershipTotalRevenue > 0 ? (dashboardData.membershipPaid / dashboardData.membershipTotalRevenue) * 100 : 0,
      });
    }

    const byPayment: Record<string, { revenue: number; collected: number }> = {};
    filteredData.forEach(entry => {
      const method = entry.paymentMethod && entry.paymentMethod !== "NONE" ? entry.paymentMethod : "Other";
      if (!byPayment[method]) byPayment[method] = { revenue: 0, collected: 0 };
      byPayment[method].revenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") byPayment[method].collected += entry.fee || 0;
    });

    return rows;
  }, [filteredData, dashboardData]);

  const sessionProfitability = useMemo(() => {
    const sessions: Record<string, { title: string; date: string; revenue: number; signups: number; paid: number; clubName: string }> = {};
    filteredData.forEach(entry => {
      const key = `${entry.sessionId}`;
      if (!sessions[key]) sessions[key] = {
        title: entry.sessionTitle,
        date: entry.sessionDate,
        revenue: 0,
        signups: 0,
        paid: 0,
        clubName: entry.clubName,
      };
      sessions[key].revenue += entry.fee || 0;
      sessions[key].signups++;
      if (entry.paymentStatus === "PAID") sessions[key].paid += entry.fee || 0;
    });
    return Object.values(sessions)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [filteredData]);

  const paymentBreakdown = useMemo(() => {
    const paid = filteredData.filter(e => e.paymentStatus === "PAID").length;
    const pending = filteredData.filter(e => e.paymentStatus === "PENDING").length;
    const unpaid = filteredData.filter(e => e.paymentStatus === "UNPAID").length;
    return [
      { name: "Paid", value: paid, percent: filteredData.length > 0 ? paid / filteredData.length : 0 },
      { name: "Pending", value: pending, percent: filteredData.length > 0 ? pending / filteredData.length : 0 },
      { name: "Unpaid", value: unpaid, percent: filteredData.length > 0 ? unpaid / filteredData.length : 0 },
    ].filter(i => i.value > 0);
  }, [filteredData]);

  const topPlayers = useMemo(() => {
    const players: Record<number, { name: string; email: string; revenue: number; sessions: number; paid: number }> = {};
    filteredData.forEach(entry => {
      if (!players[entry.playerUserId]) players[entry.playerUserId] = { name: entry.playerName, email: entry.playerEmail, revenue: 0, sessions: 0, paid: 0 };
      players[entry.playerUserId].revenue += entry.fee || 0;
      players[entry.playerUserId].sessions++;
      if (entry.paymentStatus === "PAID") players[entry.playerUserId].paid += entry.fee || 0;
    });
    return Object.values(players).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredData]);

  const toggleLayer = (layer: keyof typeof revenueLayers) => {
    setRevenueLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="relative overflow-hidden" data-testid="card-analytics-total-revenue">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <PoundSterling className="h-4 w-4 text-green-500" />
              Total Revenue
            </p>
            <AnimatedNumber value={formatPounds(totalRevenue)} prefix="£" />
            <p className="text-xs text-muted-foreground mt-2">{filteredData.length} total signups</p>
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend.slice(-6)}>
                  <Area type="monotone" dataKey="total" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-analytics-net-revenue">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Net Revenue
            </p>
            <AnimatedNumber
              value={formatPounds(Math.abs(netRevenue))}
              prefix={`${netRevenue < 0 ? "-" : ""}£`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Income minus expenses
            </p>
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend.slice(-6)}>
                  <Area type="monotone" dataKey="sessions" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-analytics-collection-rate">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-amber-500" />
              Collection Rate
            </p>
            <AnimatedNumber value={`${collectionRate}%`} />
            <p className="text-xs text-muted-foreground mt-2">
              £{formatPounds(paidTotal)} collected of £{formatPounds(totalRevenue)}
            </p>
            <div className="mt-3 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(parseFloat(collectionRate), 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-analytics-revenue-trend">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={revenueLayers.sessions ? "default" : "outline"}
                onClick={() => toggleLayer("sessions")}
                data-testid="button-toggle-sessions-layer"
              >
                Sessions
              </Button>
              <Button
                size="sm"
                variant={revenueLayers.memberships ? "default" : "outline"}
                onClick={() => toggleLayer("memberships")}
                data-testid="button-toggle-memberships-layer"
              >
                Memberships
              </Button>
              <Button
                size="sm"
                variant={revenueLayers.total ? "default" : "outline"}
                onClick={() => toggleLayer("total")}
                data-testid="button-toggle-total-layer"
              >
                Total
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
                <YAxis tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} className="text-xs" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
                <Tooltip content={<CustomTooltip />} />
                {revenueLayers.sessions && (
                  <Area type="monotone" dataKey="sessions" name="Sessions" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} />
                )}
                {revenueLayers.memberships && (
                  <Area type="monotone" dataKey="memberships" name="Memberships" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.15} strokeWidth={2} />
                )}
                {revenueLayers.total && (
                  <Area type="monotone" dataKey="total" name="Total" stroke="hsl(262, 83%, 58%)" fill="hsl(262, 83%, 58%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                )}
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {revenueDistribution.length > 0 && (
          <Card data-testid="card-analytics-revenue-distribution">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {revenueDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {clubRevenue.length > 0 && (
          <Card data-testid="card-analytics-club-comparison">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Revenue by Club
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clubRevenue} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} tick={{ fontSize: 11, fill: "var(--foreground)" }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "var(--foreground)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="collected" name="Collected" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} stackId="a" />
                    <Bar dataKey="outstanding" name="Outstanding" fill="hsl(47, 96%, 53%)" radius={[0, 4, 4, 0]} stackId="a" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {breakdownTable.length > 0 && (
        <Card data-testid="card-analytics-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PoundSterling className="h-5 w-5" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Collection Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdownTable.map((row, i) => (
                    <TableRow key={i} data-testid={`row-breakdown-${i}`}>
                      <TableCell className="font-medium">{row.source}</TableCell>
                      <TableCell className="font-bold">£{formatPounds(row.totalRevenue)}</TableCell>
                      <TableCell className="text-green-600">£{formatPounds(row.collected)}</TableCell>
                      <TableCell className={row.outstanding > 0 ? "text-orange-600" : "text-muted-foreground"}>
                        £{formatPounds(row.outstanding)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(row.rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{row.rate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {sessionProfitability.length > 0 && (
        <Card data-testid="card-analytics-session-profitability">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Session Profitability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Signups</TableHead>
                    <TableHead>Avg/Player</TableHead>
                    <TableHead>Collection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionProfitability.map((session, i) => {
                    const rate = session.revenue > 0 ? (session.paid / session.revenue) * 100 : 0;
                    const avgPerPlayer = session.signups > 0 ? session.revenue / session.signups : 0;
                    return (
                      <TableRow key={i} data-testid={`row-session-profit-${i}`}>
                        <TableCell className="font-medium max-w-[180px] truncate" title={session.title}>{session.title}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {session.date ? format(new Date(session.date), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{session.clubName}</TableCell>
                        <TableCell className="font-bold">£{formatPounds(session.revenue)}</TableCell>
                        <TableCell className="text-green-600">£{formatPounds(session.paid)}</TableCell>
                        <TableCell>{session.signups}</TableCell>
                        <TableCell className="text-muted-foreground">£{formatPounds(avgPerPlayer)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[60px]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs">{rate.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {paymentBreakdown.length > 0 && (
          <Card data-testid="card-analytics-payment-status">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Payment Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="hsl(142, 71%, 45%)" />
                      <Cell fill="hsl(47, 96%, 53%)" />
                      <Cell fill="hsl(0, 84%, 60%)" />
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} signups`, name]}
                      contentStyle={{ background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {topPlayers.length > 0 && (
          <Card data-testid="card-analytics-top-players">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Players by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {topPlayers.map((player, i) => {
                  const rate = player.revenue > 0 ? (player.paid / player.revenue) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`row-top-player-${i}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold text-muted-foreground w-6 text-right">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.sessions} sessions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-sm">£{formatPounds(player.revenue)}</span>
                        <Badge
                          variant={rate >= 100 ? "default" : "outline"}
                          className={`no-default-hover-elevate no-default-active-elevate text-xs ${rate >= 100 ? "text-green-600" : rate > 0 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {rate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {filteredData.length > 0 && (
        <Card data-testid="card-analytics-outstanding-risk">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Outstanding Payment Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const unpaidPlayers: Record<number, { name: string; amount: number; sessions: number }> = {};
              filteredData.filter(e => e.paymentStatus !== "PAID").forEach(entry => {
                if (!unpaidPlayers[entry.playerUserId]) unpaidPlayers[entry.playerUserId] = { name: entry.playerName, amount: 0, sessions: 0 };
                unpaidPlayers[entry.playerUserId].amount += entry.fee || 0;
                unpaidPlayers[entry.playerUserId].sessions++;
              });
              const sorted = Object.entries(unpaidPlayers).sort((a, b) => b[1].amount - a[1].amount).slice(0, 10);

              if (sorted.length === 0) {
                return <p className="text-sm text-muted-foreground py-4 text-center">No outstanding payments - all caught up!</p>;
              }

              return (
                <div className="space-y-2">
                  {sorted.map(([userId, player]) => (
                    <div key={userId} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20" data-testid={`row-risk-player-${userId}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.sessions} unpaid session(s)</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-red-600">£{formatPounds(player.amount)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
