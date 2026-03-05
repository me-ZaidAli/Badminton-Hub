import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { format } from "date-fns";
import { FinancialViewProps, formatPounds } from "./types";

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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-md shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground" style={{ color: entry.color }}>
          {entry.name}: £{formatPounds(entry.value)}
        </p>
      ))}
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-popover border rounded-md shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{data.title}</p>
      <p className="text-muted-foreground">Revenue: £{formatPounds(data.revenue)}</p>
      <p className="text-muted-foreground">Collected: £{formatPounds(data.collected)}</p>
      <p className="text-muted-foreground">Margin: {data.margin.toFixed(1)}%</p>
      <p className="text-muted-foreground">Signups: {data.signups}</p>
    </div>
  );
}

interface SessionData {
  sessionId: string;
  title: string;
  date: string;
  clubName: string;
  revenue: number;
  collected: number;
  signups: number;
  avgPerPlayer: number;
  collectionRate: number;
  margin: number;
  sessionType: string;
}

export default function ProfitabilityView({ filteredData, dashboardData }: FinancialViewProps) {
  const sessionData = useMemo(() => {
    const sessions: Record<string, {
      title: string;
      date: string;
      clubName: string;
      revenue: number;
      collected: number;
      signups: number;
      sessionType: string;
    }> = {};

    filteredData.forEach(entry => {
      const key = `${entry.sessionId}`;
      if (!sessions[key]) {
        sessions[key] = {
          title: entry.sessionTitle,
          date: entry.sessionDate,
          clubName: entry.clubName,
          revenue: 0,
          collected: 0,
          signups: 0,
          sessionType: entry.sessionType || "OPEN",
        };
      }
      sessions[key].revenue += entry.fee || 0;
      sessions[key].signups++;
      if (entry.paymentStatus === "PAID") sessions[key].collected += entry.fee || 0;
    });

    return Object.entries(sessions).map(([sessionId, s]): SessionData => {
      const avgPerPlayer = s.signups > 0 ? s.revenue / s.signups : 0;
      const collectionRate = s.revenue > 0 ? (s.collected / s.revenue) * 100 : 0;
      const margin = s.revenue > 0 ? (s.collected / s.revenue) * 100 : 0;
      return {
        sessionId,
        title: s.title,
        date: s.date,
        clubName: s.clubName,
        revenue: s.revenue,
        collected: s.collected,
        signups: s.signups,
        avgPerPlayer,
        collectionRate,
        margin,
        sessionType: s.sessionType,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const sessionTypeComparison = useMemo(() => {
    const types: Record<string, { type: string; revenue: number; collected: number; signups: number }> = {};
    filteredData.forEach(entry => {
      const t = entry.sessionType || "OPEN";
      const label = t === "OPEN" ? "Open" : t === "JUNIORS_ONLY" ? "Juniors" : t === "MEMBERS_ONLY" ? "Members" : t;
      if (!types[t]) types[t] = { type: label, revenue: 0, collected: 0, signups: 0 };
      types[t].revenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") types[t].collected += entry.fee || 0;
      types[t].signups++;
    });
    return Object.values(types).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const top5Most = useMemo(() => sessionData.slice(0, 5), [sessionData]);
  const top5Least = useMemo(() => {
    const sorted = [...sessionData].sort((a, b) => a.revenue - b.revenue);
    return sorted.slice(0, 5);
  }, [sessionData]);

  const scatterData = useMemo(() => {
    return sessionData.map(s => ({
      title: s.title,
      revenue: s.revenue,
      collected: s.collected,
      margin: s.margin,
      signups: s.signups,
    }));
  }, [sessionData]);

  const pricingRecommendations = useMemo(() => {
    const recommendations: { message: string; type: "positive" | "warning" | "alert" }[] = [];

    const avgRevPerSession = sessionData.length > 0
      ? sessionData.reduce((s, d) => s + d.revenue, 0) / sessionData.length
      : 0;

    const avgCollectionRate = sessionData.length > 0
      ? sessionData.reduce((s, d) => s + d.collectionRate, 0) / sessionData.length
      : 0;

    const lowMarginSessions = sessionData.filter(s => s.collectionRate < 50 && s.revenue > 0);
    if (lowMarginSessions.length > 0) {
      recommendations.push({
        message: `${lowMarginSessions.length} session(s) have collection rates below 50%. Consider stricter payment policies or upfront payment requirements.`,
        type: "alert",
      });
    }

    const lowAvgSessions = sessionData.filter(s => s.avgPerPlayer > 0 && s.avgPerPlayer < avgRevPerSession / (sessionData.length > 0 ? sessionData[0].signups || 1 : 1) * 0.5);
    if (lowAvgSessions.length > 0) {
      recommendations.push({
        message: `${lowAvgSessions.length} session(s) charge significantly below average per player. Review pricing to align with market rates.`,
        type: "warning",
      });
    }

    const highPerformers = sessionData.filter(s => s.collectionRate >= 90 && s.signups >= 4);
    if (highPerformers.length > 0) {
      recommendations.push({
        message: `${highPerformers.length} session(s) achieve 90%+ collection with good attendance. Consider premium pricing for these popular sessions.`,
        type: "positive",
      });
    }

    if (avgCollectionRate > 0 && avgCollectionRate < 70) {
      recommendations.push({
        message: `Average collection rate is ${avgCollectionRate.toFixed(1)}%. Implement pre-payment or deposit requirements to improve cash flow.`,
        type: "warning",
      });
    }

    if (avgCollectionRate >= 85) {
      recommendations.push({
        message: `Strong collection rate of ${avgCollectionRate.toFixed(1)}%. Your payment processes are working well.`,
        type: "positive",
      });
    }

    const singleSignupSessions = sessionData.filter(s => s.signups === 1);
    if (singleSignupSessions.length > 3) {
      recommendations.push({
        message: `${singleSignupSessions.length} sessions have only 1 signup. Consider consolidating low-attendance sessions or improving promotion.`,
        type: "warning",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        message: "Not enough data to generate pricing recommendations. Add more sessions to see insights.",
        type: "warning",
      });
    }

    return recommendations;
  }, [sessionData]);

  return (
    <div className="space-y-6" data-testid="profitability-view">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="relative overflow-hidden" data-testid="card-profit-total-revenue">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Session Revenue
            </p>
            <span className="tabular-nums font-bold text-2xl md:text-3xl" data-testid="text-profit-total-revenue">
              £{formatPounds(sessionData.reduce((s, d) => s + d.revenue, 0))}
            </span>
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-profit-session-count">
              {sessionData.length} sessions tracked
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-profit-avg-per-session">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-500" />
              Avg Revenue/Session
            </p>
            <span className="tabular-nums font-bold text-2xl md:text-3xl" data-testid="text-profit-avg-session">
              £{formatPounds(sessionData.length > 0 ? sessionData.reduce((s, d) => s + d.revenue, 0) / sessionData.length : 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              Avg {sessionData.length > 0 ? (sessionData.reduce((s, d) => s + d.signups, 0) / sessionData.length).toFixed(1) : "0"} players/session
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" data-testid="card-profit-avg-collection">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
          <CardContent className="pt-6 pb-4">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-amber-500" />
              Avg Collection Rate
            </p>
            <span className="tabular-nums font-bold text-2xl md:text-3xl" data-testid="text-profit-avg-collection">
              {sessionData.length > 0 ? (sessionData.reduce((s, d) => s + d.collectionRate, 0) / sessionData.length).toFixed(1) : "0.0"}%
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              Across all sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {sessionTypeComparison.length > 0 && (
        <Card data-testid="card-profit-type-comparison">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Revenue by Session Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionTypeComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="collected" name="Collected" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Total Revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {scatterData.length > 0 && (
        <Card data-testid="card-profit-scatter">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue vs Collection (by Session)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    dataKey="revenue"
                    name="Revenue"
                    tickFormatter={(v) => `£${(v / 100).toFixed(0)}`}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="collected"
                    name="Collected"
                    tickFormatter={(v) => `£${(v / 100).toFixed(0)}`}
                    tick={{ fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="signups" range={[40, 400]} name="Signups" />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter
                    name="Sessions"
                    data={scatterData}
                    fill="hsl(262, 83%, 58%)"
                    fillOpacity={0.7}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {top5Most.length > 0 && (
          <Card data-testid="card-profit-top5-most">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
                Top 5 Most Profitable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {top5Most.map((session, i) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between gap-4 flex-wrap"
                    data-testid={`row-top-profitable-${i}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-top-session-title-${i}`}>
                          {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{session.clubName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600" data-testid={`text-top-session-revenue-${i}`}>
                        £{formatPounds(session.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">{session.signups} players</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {top5Least.length > 0 && (
          <Card data-testid="card-profit-top5-least">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
                Top 5 Least Profitable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {top5Least.map((session, i) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between gap-4 flex-wrap"
                    data-testid={`row-least-profitable-${i}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-least-session-title-${i}`}>
                          {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{session.clubName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600" data-testid={`text-least-session-revenue-${i}`}>
                        £{formatPounds(session.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">{session.signups} players</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {sessionData.length > 0 && (
        <Card data-testid="card-profit-session-table">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Session Profitability Table
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
                    <TableHead>Signups</TableHead>
                    <TableHead>Avg/Player</TableHead>
                    <TableHead>Collection Rate</TableHead>
                    <TableHead>Profit Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionData.slice(0, 30).map((session, i) => {
                    let formattedDate = session.date;
                    try {
                      formattedDate = format(new Date(session.date), "dd MMM yyyy");
                    } catch {}
                    return (
                      <TableRow key={session.sessionId} data-testid={`row-profit-session-${i}`}>
                        <TableCell className="font-medium max-w-[200px] truncate" data-testid={`text-session-name-${i}`}>
                          {session.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-session-date-${i}`}>
                          {formattedDate}
                        </TableCell>
                        <TableCell data-testid={`text-session-club-${i}`}>{session.clubName}</TableCell>
                        <TableCell className="font-bold" data-testid={`text-session-revenue-${i}`}>
                          £{formatPounds(session.revenue)}
                        </TableCell>
                        <TableCell data-testid={`text-session-signups-${i}`}>{session.signups}</TableCell>
                        <TableCell data-testid={`text-session-avg-${i}`}>
                          £{formatPounds(session.avgPerPlayer)}
                        </TableCell>
                        <TableCell data-testid={`text-session-collection-${i}`}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[60px]">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(session.collectionRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm">{session.collectionRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-session-margin-${i}`}>
                          <Badge
                            variant={session.margin >= 80 ? "default" : session.margin >= 50 ? "secondary" : "destructive"}
                          >
                            {session.margin.toFixed(1)}%
                          </Badge>
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

      <Card data-testid="card-profit-pricing-recommendations">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Smart Pricing Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pricingRecommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-md border"
                data-testid={`row-recommendation-${i}`}
              >
                {rec.type === "positive" && <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
                {rec.type === "warning" && <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
                {rec.type === "alert" && <TrendingDown className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                <p
                  className={`text-sm ${
                    rec.type === "positive"
                      ? "text-green-700 dark:text-green-400"
                      : rec.type === "warning"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-red-700 dark:text-red-400"
                  }`}
                  data-testid={`text-recommendation-${i}`}
                >
                  {rec.message}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
