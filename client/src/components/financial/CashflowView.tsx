import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CreditCard,
  Landmark,
  TrendingUp,
  Wallet,
  Zap,
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
import { format, differenceInDays, parseISO } from "date-fns";
import type { FinancialViewProps } from "./types";
import { formatPounds } from "./types";

const CHART_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(47, 96%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
];

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

export default function CashflowView({ filteredData, dashboardData }: FinancialViewProps) {
  const totalInflow = useMemo(() => {
    return filteredData
      .filter((e) => e.paymentStatus === "PAID")
      .reduce((s, e) => s + (e.fee || 0), 0);
  }, [filteredData]);

  const totalOutstanding = useMemo(() => {
    return filteredData
      .filter((e) => e.paymentStatus !== "PAID")
      .reduce((s, e) => s + (e.fee || 0), 0);
  }, [filteredData]);

  const collectionVelocity = useMemo(() => {
    const paidEntries = filteredData.filter((e) => e.paymentStatus === "PAID");
    if (paidEntries.length === 0) return 0;
    let totalDays = 0;
    paidEntries.forEach((e) => {
      const sessionDate = parseISO(e.sessionDate);
      const signupDate = parseISO(e.signupTime);
      const diff = Math.abs(differenceInDays(sessionDate, signupDate));
      totalDays += diff;
    });
    return Math.round(totalDays / paidEntries.length);
  }, [filteredData]);

  const cashflowTimeline = useMemo(() => {
    const monthMap: Record<
      string,
      { month: string; inflow: number; outflow: number; outstanding: number; sortKey: string }
    > = {};

    filteredData.forEach((entry) => {
      const d = new Date(entry.sessionDate);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      if (!monthMap[key])
        monthMap[key] = { month: label, inflow: 0, outflow: 0, outstanding: 0, sortKey: key };

      if (entry.paymentStatus === "PAID") {
        monthMap[key].inflow += entry.fee || 0;
      } else {
        monthMap[key].outstanding += entry.fee || 0;
      }
    });

    if (dashboardData) {
      const expensesPerMonth =
        (dashboardData.totalExpenses || 0) /
        Math.max(Object.keys(monthMap).length, 1);
      Object.values(monthMap).forEach((m) => {
        m.outflow = Math.round(expensesPerMonth);
      });
    }

    return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData, dashboardData]);

  const paymentMethodBreakdown = useMemo(() => {
    const methods: Record<string, { name: string; value: number; count: number }> = {};

    filteredData.forEach((entry) => {
      let method = "Other";
      if (entry.paymentMethod === "CARD") method = "Card";
      else if (entry.paymentMethod === "BANK_TRANSFER") method = "Bank Transfer";

      if (!methods[method]) methods[method] = { name: method, value: 0, count: 0 };
      methods[method].value += entry.fee || 0;
      methods[method].count++;
    });

    const total = Object.values(methods).reduce((s, m) => s + m.value, 0);
    return Object.values(methods).map((m) => ({
      ...m,
      percent: total > 0 ? m.value / total : 0,
    }));
  }, [filteredData]);

  const collectionRateTrend = useMemo(() => {
    const monthMap: Record<
      string,
      { month: string; paid: number; total: number; sortKey: string }
    > = {};

    filteredData.forEach((entry) => {
      const d = new Date(entry.sessionDate);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      if (!monthMap[key])
        monthMap[key] = { month: label, paid: 0, total: 0, sortKey: key };

      monthMap[key].total += entry.fee || 0;
      if (entry.paymentStatus === "PAID") {
        monthMap[key].paid += entry.fee || 0;
      }
    });

    return Object.values(monthMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => ({
        month: m.month,
        rate: m.total > 0 ? parseFloat(((m.paid / m.total) * 100).toFixed(1)) : 0,
      }));
  }, [filteredData]);

  const outstandingTrend = useMemo(() => {
    const monthMap: Record<
      string,
      { month: string; outstanding: number; sortKey: string }
    > = {};

    filteredData.forEach((entry) => {
      if (entry.paymentStatus !== "PAID") {
        const d = new Date(entry.sessionDate);
        const key = format(d, "yyyy-MM");
        const label = format(d, "MMM yy");
        if (!monthMap[key])
          monthMap[key] = { month: label, outstanding: 0, sortKey: key };
        monthMap[key].outstanding += entry.fee || 0;
      }
    });

    return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData]);

  const paymentBehaviourInsights = useMemo(() => {
    const paidEntries = filteredData.filter((e) => e.paymentStatus === "PAID");
    const unpaidEntries = filteredData.filter((e) => e.paymentStatus === "UNPAID");
    const pendingEntries = filteredData.filter((e) => e.paymentStatus === "PENDING");

    const totalEntries = filteredData.length;
    const paidRate = totalEntries > 0 ? ((paidEntries.length / totalEntries) * 100).toFixed(1) : "0.0";
    const unpaidRate = totalEntries > 0 ? ((unpaidEntries.length / totalEntries) * 100).toFixed(1) : "0.0";

    return {
      paidCount: paidEntries.length,
      unpaidCount: unpaidEntries.length,
      pendingCount: pendingEntries.length,
      paidRate,
      unpaidRate,
      totalEntries,
    };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="relative overflow-hidden" data-testid="card-cashflow-total-inflow">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              Total Inflow
            </p>
            <span className="tabular-nums font-bold text-2xl md:text-3xl" data-testid="text-total-inflow">
              £{formatPounds(totalInflow)}
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              {paymentBehaviourInsights.paidCount} payments received
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-cashflow-total-outstanding">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-orange-500" />
              Total Outstanding
            </p>
            <span className="tabular-nums font-bold text-2xl md:text-3xl" data-testid="text-total-outstanding">
              £{formatPounds(totalOutstanding)}
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              {paymentBehaviourInsights.unpaidCount + paymentBehaviourInsights.pendingCount} payments pending
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-cashflow-velocity">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-500" />
              Collection Velocity
            </p>
            <span className="tabular-nums font-bold text-2xl md:text-3xl" data-testid="text-collection-velocity">
              {collectionVelocity} days
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              Average signup-to-session gap
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-cashflow-timeline">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cashflow Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashflowTimeline.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="inflow" name="Inflow" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Outflow" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outstanding" name="Outstanding" fill="hsl(47, 96%, 53%)" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No cashflow data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card data-testid="card-cashflow-payment-methods">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodBreakdown.length > 0 ? (
              <div className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentMethodBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No payment data available</p>
            )}
            <div className="mt-4 space-y-2">
              {paymentMethodBreakdown.map((method, i) => (
                <div key={method.name} className="flex items-center justify-between gap-2" data-testid={`row-payment-method-${i}`}>
                  <div className="flex items-center gap-2">
                    {method.name === "Card" && <CreditCard className="h-4 w-4 text-muted-foreground" />}
                    {method.name === "Bank Transfer" && <Landmark className="h-4 w-4 text-muted-foreground" />}
                    {method.name === "Other" && <Wallet className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm">{method.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">£{formatPounds(method.value)}</span>
                    <Badge variant="secondary">{(method.percent * 100).toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-cashflow-outstanding-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Outstanding Balance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingTrend.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={outstandingTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="outstanding"
                      name="Outstanding"
                      stroke="hsl(0, 84%, 60%)"
                      fill="hsl(0, 84%, 60%)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No outstanding balances</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-cashflow-collection-trend">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Collection Rate Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collectionRateTrend.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collectionRateTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Collection Rate"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Collection Rate"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142, 71%, 45%)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No collection data available</p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-cashflow-payment-behaviour">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Payment Behaviour Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-2" data-testid="insight-paid-rate">
              <p className="text-sm text-muted-foreground">Payment Success Rate</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">{paymentBehaviourInsights.paidRate}%</span>
                <Badge variant="secondary">{paymentBehaviourInsights.paidCount} paid</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(paymentBehaviourInsights.paidRate), 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2" data-testid="insight-unpaid-rate">
              <p className="text-sm text-muted-foreground">Unpaid Rate</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-orange-600">{paymentBehaviourInsights.unpaidRate}%</span>
                <Badge variant="secondary">{paymentBehaviourInsights.unpaidCount} unpaid</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(paymentBehaviourInsights.unpaidRate), 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2" data-testid="insight-pending-count">
              <p className="text-sm text-muted-foreground">Pending Payments</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">{paymentBehaviourInsights.pendingCount}</span>
                <Badge variant="secondary">awaiting</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                of {paymentBehaviourInsights.totalEntries} total signups
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
